import type { ClassicBuild } from '../bundler/bundler-types'
import type { ViteBuildOptions } from './types'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { build } from 'vite'
import {
  restoreClassicGenerateSWRegions,
  transformClassicChunk,
  workboxRegex,
} from '../bundler/utils'

export function prepareViteBuild(
  options: ViteBuildOptions,
): ReturnType<typeof build> {
  const {
    mode,
    swSrc,
    swChunkName,
    swDest,
    swType,
    target,
    minify,
    sourcemap,
    inlineWorkboxRuntime,
    manifestEntries,
    plugins = [],
    define = {},
    envPrefix,
    envDir,
    filePaths,
    generateSW,
  } = options

  // override define entries
  define['process.env.NODE_ENV'] = JSON.stringify(mode || process.env.NODE_ENV || 'production')
  if (generateSW) {
    delete define['self.__WB_MANIFEST']
  }
  else {
    define['self.__WB_MANIFEST'] = JSON.stringify(manifestEntries)
  }

  const swName = path.basename(swDest)

  const workboxName = inlineWorkboxRuntime !== true
    ? (inlineWorkboxRuntime.workboxChunkName || (swType === 'classic' ? 'workbox-classic' : 'workbox-module'))
    : undefined

  plugins.push(GenerateBundlePlugin({
    swType,
    filePaths,
    generateSW,
    region: {
      search: swSrc,
      replacement: swDest,
    },
    swChunkName,
    workboxName,
  }))

  return build({
    plugins,
    configFile: false,
    // don't copy anything from public dir
    publicDir: false,
    forceOptimizeDeps: false,
    envPrefix,
    envDir,
    build: {
      emptyOutDir: false,
      outDir: path.dirname(path.resolve(process.cwd(), swDest)),
      target,
      minify,
      sourcemap,
      manifest: false,
      rolldownOptions: {
        input: swSrc,
        platform: 'browser',
        treeshake: true,
        output: {
          format: 'esm',
          comments: {
            legal: !minify,
            jsdoc: false,
            annotation: false,
          },
          cleanDir: false,
          hashCharacters: options.workboxRuntimeCompatible ? 'hex' : undefined,
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
        },
        transform: {
          define,
        },
      },
    },
  })
}

function GenerateBundlePlugin({
  swType,
  region,
  swChunkName,
  filePaths,
  generateSW,
  workboxName,
}: ClassicBuild): import('vite').Plugin {
  return {
    name: 'vite-pwa:workbox-build:classic-sw:build-plugin',
    enforce: 'post',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_, bundle) {
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
    },
  } satisfies import('vite').Plugin
}
