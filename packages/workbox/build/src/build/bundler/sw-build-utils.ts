import type { ManifestEntry } from '../../types'
import type { Bundler, CircularDependenciesDetection, ClassicBuild } from './bundler-types'
import path from 'node:path'
import MagicString from 'magic-string'
import pc from 'picocolors'
import {
  restoreClassicGenerateSWRegions,
  transformClassicChunk,
} from './utils'

interface CheckManifestOptions {
  manifestEntries: ManifestEntry[]
  swChunks: Map<string, string[]>
}

export function checkManifestEntries({
  manifestEntries,
  swChunks,
}: CheckManifestOptions) {
  if (!manifestEntries.length || !swChunks.size) {
    return
  }

  if (manifestEntries.length > 0) {
    const swEntries = Array.from(swChunks.values()).reduce((acc, entry) => {
      for (const c of entry) {
        acc.add(c)
      }
      return acc
    }, new Set<string>())
    const precacheEntriesFound = new Set<string>()
    for (const entry of manifestEntries) {
      if (swEntries.has(entry.url)) {
        precacheEntriesFound.add(entry.url)
      }
    }
    if (precacheEntriesFound.size > 0) {
      const filesList = Array.from(precacheEntriesFound).map(file => `    • ${pc.yellow(file)}`).join('\n')
      throw new Error([
        `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Critical precache configuration conflict detected!')}\n`,
        `  The following Service Worker chunks or internal runtime dependencies are targeted for precaching:`,
        filesList,
        `\n  ${pc.cyan('Why is this an error?')}`,
        `  A Service Worker cannot precache itself or its own internal chunk dependencies.`,
        `  Including them inside "manifestEntries" will trigger redundant network requests and`,
        `  can cause severe caching or life-cycle issues during service worker registration.`,
        `\n  ${pc.green('How to fix:')}`,
        `  Please update your configuration to exclude these file patterns from precaching (e.g., using "globIgnores").`,
      ].join('\n'))
    }
  }
}

type BundleType<T extends Bundler> = T extends 'rolldown'
  ? import('rolldown').OutputBundle
  : import('vite').Rolldown.OutputBundle

interface PrepareSWChunksOptions<T extends Bundler> {
  bundle: BundleType<T>
  destFolder: string
  data: CircularDependenciesDetection
  classicBuild: ClassicBuild
}

export async function prepareSWChunks<T extends Bundler>({
  bundle,
  destFolder,
  data,
  classicBuild: {
    swType,
    region,
    swChunkName,
    filePaths,
    generateSW,
    workboxName,
    manifestEntries,
  },
}: PrepareSWChunksOptions<T>) {
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
}
