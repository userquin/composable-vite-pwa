import type { BasePartial, ManifestTransform } from '../types'
import type { InternalManifestEntry } from './types'
import { errors } from '../validation/errors'
import {
  additionalManifestEntriesTransform,
} from './additional-manifest-entries-transform'
import { modifyURLPrefixTransform } from './modify-url-prefix-transform'
import {
  noRevisionForURLsMatchingTransform,
} from './no-revision-for-urls-matching-transform'

export async function transformManifest({
  additionalManifestEntries,
  additionalManifestEntriesGenerator,
  dontCacheBustURLsMatching,
  manifestEntries,
  manifestTransforms,
  modifyURLPrefix,
  warnings,
}: BasePartial & {
  manifestEntries: InternalManifestEntry[]
  warnings: string[]
}): Promise<InternalManifestEntry[]> {
  if (additionalManifestEntriesGenerator) {
    for await (const entry of additionalManifestEntriesGenerator) {
      manifestEntries.push({ ...entry, size: 0 })
    }
  }

  const seen = new Set<string>()
  const uniqueEntries: InternalManifestEntry[] = []
  for (const entry of manifestEntries) {
    if (seen.has(entry.url)) {
      warnings.push(`Duplicate precache entry skipped: ${entry.url}`)
      continue
    }
    seen.add(entry.url)
    uniqueEntries.push(entry)
  }
  manifestEntries = uniqueEntries
  
  const transformsToApply: ManifestTransform[] = []
  if (modifyURLPrefix) {
    transformsToApply.push(modifyURLPrefixTransform(modifyURLPrefix))
  }
  if (dontCacheBustURLsMatching) {
    transformsToApply.push(noRevisionForURLsMatchingTransform(dontCacheBustURLsMatching))
  }
  if (manifestTransforms) {
    transformsToApply.push(...manifestTransforms)
  }

  if (additionalManifestEntries) {
    transformsToApply.push(
      additionalManifestEntriesTransform(additionalManifestEntries),
    )
  }

  for (const transformer of transformsToApply) {
    const result = await transformer(manifestEntries)
    if (!('manifest' in result)) {
      throw new Error(errors['bad-manifest-transforms-return-value'])
    }
    manifestEntries = result.manifest
    if (result.warnings) {
      warnings.push(...result.warnings)
    }
  }

  return manifestEntries
}
