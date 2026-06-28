import type { ManifestEntry } from '@composable-vite-pwa/workbox-build/types'
import type { PWAPluginContext } from './context-types'
import { generateWebManifest } from './generate-web-manifest'

export function additionalManifestEntriesFactory(
  ctx: PWAPluginContext<any, any, any, any>,
  mapFile: (url: string) => string,
): () => AsyncGenerator<string | ManifestEntry, undefined, void> {
  return async function* additionalManifestEntries(): AsyncGenerator<string | ManifestEntry, undefined, void> {
    const {
      includeManifest,
      includeManifestIcons,
      includeAssets,
      includeManifestShortcutIcons,
      includeManifestScreenshots,
    } = ctx.resolvedOptions
    if (includeManifest || includeManifestIcons || includeAssets || includeManifestScreenshots || includeManifestShortcutIcons) {
      const manifest = ctx.resolvedOptions.manifest
      const [{ hash }, { readFile }] = await Promise.all([
        import('node:crypto'),
        import('node:fs/promises'),
      ])
      if (manifest) {
        if (includeManifest) {
          yield {
            url: ctx.resolvedOptions.manifestFilename!,
            revision: hash('md5', generateWebManifest(ctx), { outputEncoding: 'hex' }),
          }
        }
        if (includeManifestIcons && manifest.icons) {
          // pwa assets can add the icons on the fly
          const consumerIcons = new Set<string>()
          if (ctx.consumerOptions.manifest && ctx.consumerOptions.manifest.icons) {
            for (const icon of ctx.consumerOptions.manifest.icons) {
              if (icon.src) {
                consumerIcons.add(mapFile(icon.src))
              }
            }
          }
          for (const icon of manifest.icons) {
            if (icon.src) {
              const path = mapFile(icon.src)
              if (!consumerIcons.has(path)) {
                continue
              }
              yield {
                url: icon.src,
                revision: hash('md5', await readFile(path), { outputEncoding: 'hex' }),
              }
            }
          }
        }
        if (includeManifestShortcutIcons && manifest.shortcuts) {
          for (const shortcut of manifest.shortcuts) {
            if (shortcut.icons) {
              for (const icons of shortcut.icons) {
                if (icons.src) {
                  yield {
                    url: icons.src,
                    revision: hash('md5', await readFile(mapFile(icons.src)), { outputEncoding: 'hex' }),
                  }
                }
              }
            }
          }
        }
        if (includeManifestScreenshots && manifest.screenshots) {
          for (const screenshot of manifest.screenshots) {
            yield {
              url: screenshot.src,
              revision: hash('md5', await readFile(mapFile(screenshot.src)), { outputEncoding: 'hex' }),
            }
          }
        }
        if (includeAssets) {
          const assets = typeof includeAssets === 'string' ? [includeAssets] : includeAssets
          for (const asset of assets) {
            yield {
              url: asset,
              revision: hash('md5', await readFile(mapFile(asset)), { outputEncoding: 'hex' }),
            }
          }
        }
      }
    }

    const consumerGenerator = ctx.consumerOptions.additionalManifestEntriesGenerator
    if (consumerGenerator) {
      yield* consumerGenerator()
    }
  }
}
