import type { GenerateSWOptions, GetManifestResult, InjectManifestOptions, ManifestEntry } from '../types'
import type { InternalManifestEntry } from './types'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { glob } from 'tinyglobby'
import { DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES } from './constants'
import { checkMaximumFileSizeToCacheExceeded } from './log'
import { migrateGlobsToPicomatch } from './migrate-globs-to-picomatch'

export async function generateManifestEntries(
  options: GenerateSWOptions | InjectManifestOptions,
): Promise<GetManifestResult> {
  if (!options.globDirectory) {
    return {
      count: 0,
      manifestEntries: [],
      size: 0,
      warnings: [],
    }
  }

  const globPatterns = options.globPatterns!
  const globIgnores = options.globIgnores!

  const { patterns, ignore } = migrateGlobsToPicomatch({
    globPatterns,
    globIgnores,
  })

  // Make sure we leave swDest out of the precache manifest.
  // todo: add swDest here to ignores

  // If we create an extra external runtime file, ignore that, too.
  // See https://rollupjs.org/guide/en/#outputchunkfilenames for naming.
  // todo: add glob here for 'workbox-*.js' here to ignores (when !options.inlineWorkboxRuntime) => can be done from outside

  const assets = await glob(patterns, {
    cwd: options.globDirectory,
    ignore,
    onlyFiles: true,
    absolute: false,
    followSymbolicLinks: options.globFollow,
  })

  const maxFileSize = options.maximumFileSizeToCacheInBytes ?? DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES
  const maxFileSizeExceeded: (ManifestEntry & { size: number })[] = []

  let manifestEntries: (ManifestEntry & { size: number })[] = []
  for await (const manifest of hashManifestEntries(assets, options)) {
    if (manifest.size > maxFileSize) {
      maxFileSizeExceeded.push(manifest)
    }
    else {
      manifestEntries.push(manifest)
    }
  }

  const message = checkMaximumFileSizeToCacheExceeded(
    options.maximumFileSizeToCacheInBytes ?? DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES,
    maxFileSizeExceeded,
  )

  if (options.throwMaximumFileSizeToCacheInBytes && message) {
    throw new Error(message)
  }

  const warnings = [message].filter(Boolean) as string[]

  if (options.manifestTransforms) {
    for (const mt of options.manifestTransforms) {
      const result = await mt(manifestEntries, options)
      manifestEntries = result.manifest
      if (result.warnings) {
        warnings.push(...result.warnings)
      }
    }
  }

  const size = manifestEntries.reduce((acc, entry) => acc + entry.size, 0)
  const count = manifestEntries.length

  return {
    count,
    size,
    manifestEntries: manifestEntries.map(({ size, ...rest }) => rest),
    warnings,
  }
}

async function* hashManifestEntries(
  assets: string[],
  options: GenerateSWOptions,
): AsyncGenerator<InternalManifestEntry, undefined, void> {
  for (const asset of assets) {
    const filePath = resolve(options.globDirectory!, asset)
    const stats = await stat(filePath)
    const revision = createHash('md5').update(await readFile(filePath)).digest('hex')
    yield { url: asset, revision, size: stats.size }
  }
}
