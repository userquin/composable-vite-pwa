import type {
  Bundler,
  BundlerPluginType,
  CircularDependenciesDetection,
  ClassicBuild,
  RolldownOptions,
  // PrepareBundlerBuilder,
  // RolldownOptions,
} from './bundler-types'
import path from 'node:path'
import MagicString from 'magic-string'
import pc from 'picocolors'
import { checkManifestEntries, prepareSWChunks } from './sw-build-utils'
import {
  camelize,
  restoreClassicGenerateSWRegions,
  transformClassicChunk,
  workboxRegex,
} from './utils'

function GenerateBundlePlugin<T extends Bundler>(
  bundler: T,
  destFolder: string,
  data: CircularDependenciesDetection,
  classicBuild: ClassicBuild,
): BundlerPluginType<T> {
  return {
    name: 'vite-pwa:workbox-build:build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      await prepareSWChunks({
        bundle,
        destFolder,
        data,
        classicBuild,
      })
    },
  } as BundlerPluginType<T>
}

function GenerateBundlePlugin2<T extends Bundler>(
  bundler: T,
  destFolder: string,
  data: CircularDependenciesDetection,
  {
    swType,
    region,
    swChunkName,
    filePaths,
    generateSW,
    workboxName,
    manifestEntries,
  }: ClassicBuild,
): BundlerPluginType<T> {
  return {
    name: 'vite-pwa:workbox-build:build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      let workboxFileName: string | undefined
      for (const chunk of Object.values(bundle)) {
        filePaths.push(path.resolve(destFolder, chunk.fileName))
        if (workboxName && chunk.name === workboxName) {
          workboxFileName = chunk.fileName
        }
        if (chunk.name && chunk.type === 'chunk') {
          let imports: string[] | undefined
          if (data.mappedChunkFiles.has(chunk.name)) {
            data.mappedChunkFiles.set(chunk.name, chunk.fileName)
            if (chunk.imports.length > 0) {
              imports = Array.from(chunk.imports)
            }
          }
          else if (chunk.imports.length > 0) {
            imports = Array.from(chunk.imports)
          }
          if (imports) {
            data.mappedChunkImports.set(chunk.name, chunk.imports)
          }
        }
      }

      checkManifestEntries({
        manifestEntries,
        swChunks: data.mappedChunkImports,
      })

      // prepare imports
      console.log(data.mappedChunkImports)

      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk')
          continue

        let magicString: MagicString | undefined

        if (swType === 'classic') {
          if (workboxName) {
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
                data,
              ).then(({ ms }) => ms)
            }
          }

          // --- custom chunks ---
          if (data.mappedChunkFiles.has(chunk.name)) {
            magicString = await transformClassicChunk(
              chunk.name,
              chunk.code,
              generateSW,
              region,
              workboxFileName,
              data,
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

interface Options<T extends Bundler> {
  bundler: T
  destFolder: string
  classicBuild: ClassicBuild
  rolldownOptions: import('rolldown').OutputOptions
  options: RolldownOptions<T>
}

export async function prepareCustomChunksBundlerBuildOptions<T extends Bundler>({
  bundler,
  destFolder,
  rolldownOptions,
  classicBuild,
  options,
}: Options<T>): Promise<BundlerPluginType<T>> {
  const {
    // sourcemap,
    swType,
    // swSrc,
    // swDest,
    swChunkName,
    // minify,
    // inlineWorkboxRuntime,
    // workboxRuntimeCompatible,
    // plugins = [],
    // generateSW,
    // filePaths,
  } = options

  const customChunk = options.customChunks
  const workboxName = classicBuild.workboxName
  const addPrefix = workboxName?.startsWith('workbox-') ?? false

  const data: CircularDependenciesDetection = {
    customChunkNames: new Map<string, string>(),
    mappedChunkFiles: new Map<string, string>(),
    mappedChunkImports: new Map<string, string[]>(),
    importedFileChunks: new Map<string, string[]>(),
  }

  const customOptions = {
    codeSplitting: {
      groups: [{
        name: (moduleId, ctx) => {
          if (!workboxName && !customChunk) {
            return undefined
          }
          if (workboxName) {
            const chunk = workboxRegex.some(r => r.test(moduleId)) ? workboxName : undefined
            if (chunk) {
              return chunk
            }
          }

          if (!customChunk) {
            return undefined
          }

          const customChunkName = customChunk(moduleId, ctx)
          if (!customChunkName) {
            return undefined
          }

          // Check customChunkName against swChunkName and workboxName to avoid conflicts.
          // If it matches any of them, we throw an error because the consumer can achieve
          // the exact same behavior by simply returning undefined or false from this callback,
          // which safely routes the module into the main Service Worker chunk (if imported there).
          // Or just lets Rolldown handle it if not being imported by the Service Worker.
          if (customChunkName === swChunkName || customChunkName === workboxName) {
            throw new Error([
              `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red(`Custom chunk name "${pc.yellow(customChunkName)}" conflicts with the Service Worker or Workbox runtime chunk names!`)}\n`,
              `  - To include "${pc.yellow(customChunkName)}" inside the SW chunk, simply return undefined or false from the customChunks callback.`,
              `  - If the "${pc.yellow(customChunkName)}" module is not being imported by the SW chunk, let Rolldown handle its optimization.`,
            ].join('\n'))
          }

          if (addPrefix) {
            const mappedChunkName = `${swType}-${customChunkName}`
            data.customChunkNames.set(customChunkName, camelize(customChunkName))
            data.mappedChunkFiles.set(customChunkName, customChunkName)
            return mappedChunkName
          }
          else {
            data.customChunkNames.set(customChunkName, camelize(customChunkName))
            data.mappedChunkFiles.set(customChunkName, customChunkName)
            return customChunkName
          }
        },
      }],
    },
  } as import('rolldown').OutputOptions

  Object.assign(rolldownOptions, customOptions)

  return GenerateBundlePlugin(
    bundler,
    destFolder,
    data,
    classicBuild,
  )
}
