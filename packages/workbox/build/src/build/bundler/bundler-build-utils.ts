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

/**
 * This is a simplified version of Vite logic using:
 * - [resolved configuration logic](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/config.ts) and
 * - [definePlugin](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/plugins/define.ts)
 *
 * @param options The Rolldown options to use.
 */
async function prepareDefineOptions<T extends Bundler>(
  options: RolldownOptions<T>,
): Promise<Record<string, string>> {
  // 1. Extract original environment data captured from the plugin
  const original = options.originalEnvironmentData

  // 2. Initial Mode and NODE_ENV resolution
  // Vite sets NODE_ENV based on the mode if not present in the process
  const mode = options.mode || original.mode || 'production'

  // Use a local variable to avoid mutating the global process.env
  let resolvedNodeEnv = process.env.NODE_ENV || mode

  // 3. envDir normalization (following Vite's resolveConfig logic)
  const envDir = original.envDir !== false
    ? path.resolve(process.cwd(), original.envDir || options.envDir || '.')
    : false

  const envPrefix = original.envPrefix ?? options.envPrefix ?? 'VITE_'

  // 4. Load .env files using your internal loadEnv
  let userEnv: Record<string, string> = {}
  if (envDir !== false) {
    const resolvedPrefixes = resolveEnvPrefix(envPrefix)
    userEnv = loadEnv(mode, envDir, resolvedPrefixes)
  }

  // 5. Handle VITE_USER_NODE_ENV (Vite's staging/custom mode logic)
  // If the loaded .env has VITE_USER_NODE_ENV=development, we force NODE_ENV
  const isNodeEnvSet = !!process.env.NODE_ENV
  const userNodeEnv = userEnv.VITE_USER_NODE_ENV || process.env.VITE_USER_NODE_ENV
  if (!isNodeEnvSet && userNodeEnv === 'development') {
    resolvedNodeEnv = 'development'
  }

  const isProduction = resolvedNodeEnv === 'production'

  // 6. Build the ENV object (Equivalent to resolved.env in Vite)
  const builtInEnv = {
    MODE: mode,
    DEV: !isProduction,
    PROD: isProduction,
    SSR: false,
    BASE_URL: original.baseUrl || './',
  }

  const mergedEnv = Object.assign({}, builtInEnv, userEnv)

  // 7. Prepare the final DEFINE object
  const define: Record<string, any> = {
    // Process.env.NODE_ENV replacements (matching Vite's definePlugin)
    'process.env.NODE_ENV': JSON.stringify(resolvedNodeEnv),
    'global.process.env.NODE_ENV': JSON.stringify(resolvedNodeEnv),
    'globalThis.process.env.NODE_ENV': JSON.stringify(resolvedNodeEnv),
  }

  // 8. Static individual replacements for import.meta.env.KEY
  for (const [key, value] of Object.entries(mergedEnv)) {
    define[`import.meta.env.${key}`] = JSON.stringify(value)
  }

  // 9. Full object replacement for import.meta.env
  define['import.meta.env'] = JSON.stringify(mergedEnv)

  // 10. Apply User-Specific Defines (Last word)
  // We prioritize: User Define > User Env (.env) > Built-in Env
  if (original.define) {
    for (const [key, value] of Object.entries(original.define)) {
      // If it's already a string that looks serialized, keep it; otherwise, stringify.
      define[key] = typeof value === 'string' && (value.startsWith('"') || value.startsWith('\''))
        ? value
        : JSON.stringify(value)
    }
  }

  // Workbox Placeholder
  const withInjectPoint = !options.generateSW && !!original.injectionPoint
  const injectionKey = withInjectPoint
    ? (original.injectionPoint as string)
    : 'self.__WB_MANIFEST'

  define[injectionKey] = withInjectPoint
    ? JSON.stringify(options.manifestEntries)
    : JSON.stringify('undefined')

  return define
}

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

  const define = await prepareDefineOptions(options)

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
