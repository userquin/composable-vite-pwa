import type { ClassicBuild } from '../bundler/bundler-types'
import type { RolldownBuildOptions } from './types'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { rolldown } from 'rolldown'
import {
  restoreClassicGenerateSWRegions,
  transformClassicChunk,
  workboxRegex,
} from '../bundler/utils'

export interface ResolvedRolldownOptions {
  rolldownOptions: import('rolldown').InputOptions
  writeOptions?: import('rolldown').OutputOptions
}

export async function prepareRolldownBuild(
  options: RolldownBuildOptions,
): Promise<import('rolldown').RolldownOutput> {
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

  return rolldown({
    input: swSrc,
    platform: 'browser',
    treeshake: true,
    plugins,
    transform: {
      define,
      target,
    },
  }).then((instance) => {
    const swName = path.basename(swDest)

    const workboxName = inlineWorkboxRuntime !== true
      ? (inlineWorkboxRuntime.workboxChunkName || (
          swType === 'classic'
            ? 'workbox-classic'
            : 'workbox-module'
        ))
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

    return instance.write({
      sourcemap,
      minify,
      format: 'esm',
      dir: path.resolve(process.cwd(), path.dirname(swDest)),
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
    })
  })
}

function GenerateBundlePlugin({
  swType,
  region,
  swChunkName,
  filePaths,
  generateSW,
  workboxName,
}: ClassicBuild): import('rolldown').Plugin {
  return {
    name: 'vite-pwa:workbox-build:classic-sw:build-plugin',
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
  } satisfies import('rolldown').Plugin
}
