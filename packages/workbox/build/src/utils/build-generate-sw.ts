import type { BuildResult, GenerateSWOptions, SWType } from '../types'
import type { GenerateSWResult } from './types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { deepMergeObject } from 'magicast/helpers'
import { validateGenerateSW } from '../validation/validation-helper'
import { prepareSWCode } from './prepare-sw-code'

export async function buildGenerateSW<T extends SWType>(options: GenerateSWOptions<T>): Promise<GenerateSWResult<T>> {
  const optionsWithDefaults = await validateGenerateSW(options)

  deepMergeObject(options, optionsWithDefaults)

  return await prepareTSDown(options).then(build => build())
}

function prepareGlobIgnores(
  options: GenerateSWOptions<SWType>,
): string {
  const { swDest } = options
  const entry = options.swDest.replace('.js', '.temp.js')
  const parts = swDest.split('/')
  const fileName = parts.pop()
  const p = parts.join('/')

  const classic = `${p ? `${p}/` : ''}classic-${fileName}`

  options.globIgnores ??= []
  options.globIgnores.push(swDest)
  options.globIgnores.push(classic)
  options.globIgnores.push('**/workbox-*.js')
  // add temp sw
  options.globIgnores.push(entry)
  if (options.sourcemap) {
    options.globIgnores.push(`${swDest}.map`)
    options.globIgnores.push(`${classic}.map`)
    // add temp sw map
    options.globIgnores.push(`${entry}.map`)
    options.globIgnores.push('**/workbox-*.js.map')
  }

  return classic
}

const CLASSIC_SW_AMD_PREFIX = `if (!self.define) {
  let registry = {};

  // Used for \`eval\` and \`importScripts\` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri, parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          nextDefineUri = uri;
          importScripts(uri);
          resolve();
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(\`Module \${uri} didn’t register its module\`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    // Module is already loading or loaded.
    if (registry[uri]) {
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}`

async function prepareClassicSWCode(swCode: string, sourcemap: boolean): Promise<{
  code: string
  map?: string
}> {
  if (!sourcemap) {
    return { code: `${CLASSIC_SW_AMD_PREFIX}\n${swCode}` }
  }

  const MagicString = await import('magic-string').then(m => m.default || m)
  const s = new MagicString(swCode)
  s.prepend(CLASSIC_SW_AMD_PREFIX)

  return {
    code: s.toString(),
    map: sourcemap ? s.generateMap({ hires: true }).toString() : undefined,
  }
}

async function prepareTSDown<T extends SWType>(options: GenerateSWOptions<T>): Promise<() => Promise<GenerateSWResult<T>>> {
  const classicSWDestName = prepareGlobIgnores(options)
  let useMode: 'classic' | 'module' = options.swType === 'classic-and-module' ? 'classic' : options.swType
  function resolveMode() {
    return useMode
  }
  const [
    build,
    inputOptions,
  ] = await Promise.all([
    import('tsdown').then(({ build }) => build),
    async () => {
      if (resolveMode() === 'classic') {
        const [babel, babelAmd, babelDynamicImport] = await Promise.all([
          // @ts-expect-error missing types ?
          import('@babel/core'),
          // @ts-expect-error missing types ?
          import('@babel/plugin-transform-modules-amd'),
          // @ts-expect-error missing types ?
          import('@babel/plugin-transform-dynamic-import'),
        ])

        return {
          experimental: {
            resolveNewUrlToAsset: true,
          },
          plugins: [{
            name: 'transform-chunk-amd',
            async renderChunk(code, { fileName }) {
              const result = await babel.transformAsync(code, {
                babelrc: false,
                configFile: false,
                sourceMaps: options.sourcemap,
                plugins: [babelDynamicImport, babelAmd],
              })

              return fileName.startsWith('workbox')
                ? { code: result.code, map: result.map }
                : await prepareClassicSWCode(result.code, options.sourcemap === true)
            },
          }],
        } satisfies Partial<import('tsdown').InlineConfig['inputOptions']>
      }

      return undefined
    },
  ])

  const { swCode, ...entriesResult } = await prepareSWCode(options)

  const define: import('tsdown').InlineConfig['define'] = {}

  if (options.mode) {
    define['process.env.NODE_ENV'] = JSON.stringify(options.mode)
  }
  if (options.disableDevLogs) {
    define.__WB_DISABLE_DEV_LOGS = 'true'
  }

  const workboxRegex = [/[\\/]workbox-swkit[\\/]/, /workbox[\\/]swkit/]

  // write once tsdown and babel are resolved
  const entry = options.swDest.replace('.js', '.temp.js')
  const tempDest = path.resolve(process.cwd(), entry)
  await fs.mkdir(path.dirname(tempDest), { recursive: true })
  await fs.writeFile(tempDest, swCode, 'utf-8')
  let dest = path.resolve(process.cwd(), options.swDest)
  const filePaths: string[] = []

  let deleteTempSWFile = true

  const inlineConfig: () => import('tsdown').InlineConfig = () => ({
    dts: false,
    clean: false,
    entry,
    platform: 'browser',
    fromVite: false,
    format: 'esm',
    outDir: process.cwd(),
    define,
    sourcemap: options.sourcemap,
    treeshake: true,
    inputOptions,
    outputOptions: () => ({
      comments: {
        legal: true,
        jsdoc: false,
        annotation: false,
      },
      hashCharacters: !options.inlineWorkboxRuntime ? 'hex' : undefined,
      codeSplitting: !options.inlineWorkboxRuntime
        ? {
            groups: [
              {
                minSize: 0,
                name: (moduleId) => {
                  const match = workboxRegex.some(r => r.test(moduleId)) ? 'workbox' : undefined
                  console.log(resolveMode(), moduleId, match)
                  return match
                },
              },
            ],
          }
        : undefined,
    }),
    hooks: {
      'build:done': async ({ chunks }) => {
        filePaths.push(dest)
        if (deleteTempSWFile) {
          await fs.rename(tempDest, dest)
        }
        else {
          await fs.cp(tempDest, dest, { force: true })
        }
        const tempDestMap = `${tempDest}.map`
        const sourceMap = await fs.lstat(tempDestMap).then(s => s.isFile()).catch(() => false)
        if (sourceMap) {
          filePaths.push(`${dest}.map`)
          await Promise.all([
            fs.readFile(dest, 'utf-8').then(content => fs.writeFile(
              dest,
              content.replace(
                `${entry}.map`,
                `${options.swDest}.map`,
              ).replace(
                `//#region ${entry}`,
                `//#region ${options.swDest}`,
              ),
              'utf-8',
            )),
            fs.readFile(tempDestMap, 'utf-8').then(content => fs.writeFile(
              `${options.swDest}.map`,
              content.replaceAll(
                `"${entry}"`,
                `"${options.swDest}"`,
              ),
            )).then(() => {
              fs.rm(tempDestMap).catch(() => {})
            }),
          ])
        }
        for (const chunk of chunks) {
          if (!chunk.fileName.startsWith('workbox')) {
            continue
          }
          filePaths.push(path.resolve(chunk.outDir, chunk.fileName))
        }
      },
    },
  })

  return async () => {
    if (options.swType === 'classic' || options.swType === 'module') {
      await build(inlineConfig())
      const {
        count,
        size,
        warnings,
      } = entriesResult
      return {
        count,
        filePaths,
        size,
        warnings,
      } as GenerateSWResult<T>
    }

    // dual build: classic first then module
    useMode = 'classic'
    dest = path.resolve(process.cwd(), classicSWDestName)
    deleteTempSWFile = false
    await build(inlineConfig())
    const {
      count,
      size,
      warnings,
    } = entriesResult
    const classic: BuildResult = {
      count,
      filePaths: Array.from(filePaths),
      size,
      warnings: Array.from(warnings),
    }
    // reset data
    useMode = 'module'
    dest = path.resolve(process.cwd(), options.swDest)
    filePaths.length = 0
    // delete temp SW
    deleteTempSWFile = true
    await build(inlineConfig())
    return {
      classic,
      module: {
        count,
        filePaths,
        size,
        warnings,
      },
    } as GenerateSWResult<T>
  }
}
