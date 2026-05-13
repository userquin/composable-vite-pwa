import type { Bundler, ClassicBuild } from './bundler-types'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { loadEnv, resolveEnvPrefix } from './env'
import { restoreClassicGenerateSWRegions, transformClassicChunk, workboxRegex } from './utils'

type BundlerPluginType<T extends Bundler> = T extends 'rolldown'
  ? import('rolldown').Plugin
  : import('vite').Plugin

type RolldownOptions<T extends Bundler> = T extends 'rolldown'
  ? import('../rolldown/internal-types').RolldownBuildOptions
  : import('../vite/internal-types').ViteBuildOptions

interface PrepareBundlerBuilder<T extends Bundler> {
  plugins: BundlerPluginType<T>[]
  define: import('rolldown').TransformOptions['define']
  rolldownOptions: import('rolldown').OutputOptions
}

function GenerateBundlePlugin<T extends Bundler>(
  bundler: T,
  {
    swType,
    region,
    swChunkName,
    filePaths,
    generateSW,
    workboxName,
  }: ClassicBuild,
): BundlerPluginType<T> {
  return {
    name: 'vite-pwa:workbox-build:build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      let workboxFileName: string | undefined
      for (const [_, chunk] of Object.entries(bundle)) {
        filePaths.push(chunk.fileName)
        if (workboxName && chunk.name === workboxName) {
          workboxFileName = chunk.fileName
        }
      }

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk')
          continue

        let magicString: MagicString | undefined

        if (swType === 'classic' && workboxName) {
          // --- workbox runtime ---
          if (workboxName && chunk.name === workboxName) {
            magicString = await transformClassicChunk(
              'workbox',
              chunk.code,
              generateSW,
              region,
              workboxFileName,
            ).then(({ ms }) => ms)
          }

          // --- service worker ---
          if (chunk.name === swChunkName) {
            magicString = await transformClassicChunk(
              'sw',
              chunk.code,
              generateSW,
              region,
              workboxFileName,
            ).then(({ ms }) => ms)
          }
        }
        else if (generateSW && chunk.name === swChunkName) {
          magicString = new MagicString(chunk.code)
          restoreClassicGenerateSWRegions(region, magicString)
        }

        if (magicString?.hasChanged()) {
          chunk.code = magicString.toString()
          if (chunk.map) {
            Object.assign(
              chunk.map,
              magicString.generateMap({
                source: chunk.fileName,
                includeContent: true,
                hires: true,
              }),
            )
          }
        }
      }
    },
  } as BundlerPluginType<T>
}

async function prepareDefineOptions<T extends Bundler>(
  _bundler: T,
  options: RolldownOptions<T>,
) {
  // TODO: review logic at vite:
  //  - this is the first approach to test Rolldown tree-shaking and
  //  - import.meta.env support (should also work with generateSW strategy)
  //  - we can use import.meta.env inside the handlers (generateSW)

  // Use the original options if available, otherwise fallback to the current ones
  const original = options.originalBuildSWOptions || {}

  const mode = options.mode || original.mode || 'production'
  const envDir = original.envDir ?? options.envDir ?? process.cwd()
  const envPrefix = original.envPrefix ?? options.envPrefix ?? 'VITE_'

  const define: Record<string, any> = {
    // 1. Static Replacement for NODE_ENV (Core for many libs)
    'process.env.NODE_ENV': JSON.stringify(mode),
    // 2. Workbox Placeholder
    'self.__WB_MANIFEST': options.generateSW
      ? JSON.stringify('undefined')
      : JSON.stringify(options.manifestEntries),
  }

  // 3. Load Real Environment Variables
  const resolvedPrefixes = resolveEnvPrefix(envPrefix)
  const userEnv = loadEnv(mode, envDir, resolvedPrefixes)

  // 4. Built-in Vite-like Env
  const builtInEnv = {
    MODE: mode,
    DEV: mode !== 'production',
    PROD: mode === 'production',
    SSR: false,
    BASE_URL: './',
  }

  // 5. Merge Strategy: Individual Keys
  // We prioritize: User Define > User Env (.env) > Built-in Env
  const mergedEnv = { ...builtInEnv, ...userEnv }

  for (const [key, value] of Object.entries(mergedEnv)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  // 6. Full Object Replacement
  // This allows code like: const x = import.meta.env
  define['import.meta.env'] = JSON.stringify(mergedEnv)

  // 7. Apply User-Specific Defines
  // We do this last so the user can override anything else
  if (original.define) {
    for (const [key, value] of Object.entries(original.define)) {
      // todo: check if it is an string:
      //  - Vite: Record<string, any>
      //  - Rolldown: Record<string, string>
      define[key] = value // Note: user defines are usually already stringified
    }
  }

  return define
}
/*

async function prepareDefineOptions<T extends Bundler>(
  _bundler: T,
  options: RolldownOptions<T>,
) {
  const isDefineProvided = 'define' in options
    && options.define
    && Object.keys(options.define).length > 0

  const {
    mode,
    define = {},
    envDir,
    envPrefix,
    manifestEntries,
    generateSW,
  } = options

  define['process.env.NODE_ENV'] = JSON.stringify(mode || process.env.NODE_ENV || 'production')
  if (generateSW) {
    define['self.__WB_MANIFEST'] = JSON.stringify('undefined')
  }
  else {
    define['self.__WB_MANIFEST'] = JSON.stringify(manifestEntries)
  }

  if (isDefineProvided) {
    return define
  }

  /!* let loadEnv:

  if (envDir) {
    const detection = await detectViteLoadEnvSupport()
    if (detection) {
      useEnv = true
    }
    else {
      logViteLoadEnvWarning()
    }
  } *!/

  // 1. check if vite is present: we'll need to check min. vite version exporting loadEnv
  // 2. warn consumer if vite version missing
  // 3. apply vite logic at:
  // 3.1. https://github.com/sheremet-va/vite/blob/main/packages/vite/src/node/plugins/define.ts
  // 3.2. https://github.com/vitejs/vite/blob/main/packages/vite/src/node/config.ts#L1656-L1684
  // 4. populate env + import.meta.env at define
  return define
}
*/

export async function prepareBundlerBuildOptions<T extends Bundler>(
  bundler: T,
  options: RolldownOptions<T>,
): Promise<PrepareBundlerBuilder<T>> {
  const swName = path.basename(options.swDest)
  const {
    sourcemap,
    swType,
    swSrc,
    swDest,
    swChunkName,
    minify,
    inlineWorkboxRuntime,
    workboxRuntimeCompatible,
    plugins = [],
    generateSW,
    filePaths,
  } = options

  const define = await prepareDefineOptions(bundler, options)

  const workboxName = inlineWorkboxRuntime !== true
    ? (inlineWorkboxRuntime.workboxChunkName || (
        swType === 'classic'
          ? 'workbox-classic'
          : 'workbox-module'
      ))
    : undefined

  plugins.unshift(GenerateBundlePlugin(
    bundler,
    {
      swType,
      filePaths,
      generateSW,
      region: {
        search: swSrc,
        replacement: swDest,
      },
      swChunkName,
      workboxName,
    },
  ))

  // DON'T ADD sourcemap, minify and dir here: will break vite sourcemap
  const rolldownOptions: import('rolldown').OutputOptions = {
    format: 'esm',
    comments: {
      legal: !minify,
      jsdoc: false,
      annotation: false,
    },
    cleanDir: false,
    hashCharacters: workboxRuntimeCompatible ? 'hex' : undefined,
    chunkFileNames: (chunk) => {
      return workboxName && chunk.name === workboxName
        ? `${workboxName}-[hash].js`
        : '[name]-[hash].js'
    },
    assetFileNames: '[name]-[hash].[ext]',
    entryFileNames: (chunk) => {
      return chunk.name === swChunkName
        ? swName
        : '[name]-[hash].js'
    },
    codeSplitting: workboxName
      ? {
          groups: [{
            minSize: 0,
            name: (moduleId) => {
              return workboxRegex.some(r => r.test(moduleId)) ? workboxName : undefined
            },
          }],
        }
      : false,
  }

  if (bundler === 'rolldown') {
    rolldownOptions.sourcemap = sourcemap
    rolldownOptions.minify = minify
    rolldownOptions.dir = path.resolve(process.cwd(), path.dirname(swDest))
  }

  return {
    define,
    plugins: plugins as BundlerPluginType<T>[],
    rolldownOptions,
  }
}
