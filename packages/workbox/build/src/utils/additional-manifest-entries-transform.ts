import type { InternalManifestEntry } from '@composable-vite-pwa/workbox-build/utils/types'
import type { ManifestEntry } from '../types'
import { errors } from '../validation/errors'

interface AdditionalManifestEntriesTransform {
  (manifest: InternalManifestEntry[]): {
    manifest: InternalManifestEntry[]
    warnings: string[]
  }
}

export function additionalManifestEntriesTransform(
  additionalManifestEntries: Array<ManifestEntry | string>,
): AdditionalManifestEntriesTransform {
  return (manifest: InternalManifestEntry[]) => {
    const warnings: string[] = []
    const stringEntries = new Set<string>()

    for (const additionalEntry of additionalManifestEntries) {
      // Warn about either a string or an object that lacks a revision property.
      // (An object with a revision property set to null is okay.)
      if (typeof additionalEntry === 'string') {
        stringEntries.add(additionalEntry)
        manifest.push({
          revision: null,
          size: 0,
          url: additionalEntry,
        })
      }
      else {
        if (additionalEntry && additionalEntry.revision === undefined) {
          stringEntries.add(additionalEntry.url)
        }
        manifest.push(Object.assign({ size: 0 }, additionalEntry))
      }
    }

    if (stringEntries.size > 0) {
      let urls = '\n'
      for (const stringEntry of stringEntries) {
        urls += `  - ${stringEntry}\n`
      }

      warnings.push(errors['string-entry-warning'] + urls)
    }

    return {
      manifest,
      warnings,
    }
  }
}
