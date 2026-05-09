import type { Bundler, ClassicBuild } from './bundler-types'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { restoreClassicGenerateSWRegions, transformClassicChunk, workboxRegex } from './utils'

type BundlerPluginType<T extends Bundler> = T extends 'rolldown'
  ? import('rolldown').Plugin
  : import('vite').Plugin

type RolldownOptions<T extends Bundler> = T extends 'rolldown'
  ? import('../rolldown/types').RolldownBuildOptions
  : import('../vite/types').ViteBuildOptions

interface PrepareBundlerBuilder<T extends Bundler> {
  plugins: BundlerPluginType<T>[]
  define: import('rolldown').TransformOptions['define']
  rolldownOptions: import('rolldown').OutputOptions
}

function CloseBundlePlugin<T extends Bundler>(
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
    name: 'vite-pwa:workbox-build:classic-sw:build-plugin',
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

      for (const [_, chunk] of Object.entries(bundle)) {
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

export function prepareBundlerBuildOptions<T extends Bundler>(
  bundler: T,
  options: RolldownOptions<T>,
): PrepareBundlerBuilder<T> {
  const swName = path.basename(options.swDest)
  const {
    mode,
    sourcemap,
    swType,
    swSrc,
    swDest,
    swChunkName,
    minify,
    inlineWorkboxRuntime,
    workboxRuntimeCompatible,
    plugins = [],
    define = {},
    manifestEntries,
    generateSW,
    filePaths,
  } = options
  const workboxName = inlineWorkboxRuntime !== true
    ? (inlineWorkboxRuntime.workboxChunkName || (
        swType === 'classic'
          ? 'workbox-classic'
          : 'workbox-module'
      ))
    : undefined
  define['process.env.NODE_ENV'] = JSON.stringify(mode || process.env.NODE_ENV || 'production')
  if (generateSW) {
    delete define['self.__WB_MANIFEST']
  }
  else {
    define['self.__WB_MANIFEST'] = JSON.stringify(manifestEntries)
  }
  plugins.unshift(CloseBundlePlugin(
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
