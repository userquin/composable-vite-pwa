import type { ManifestEntry } from '@composable-vite-pwa/workbox-build/types'
import type { PWAPluginContext } from './context-types'
import { generateWebManifestFile } from './assets'

export function additionalManifestEntriesFactory(
  ctx: PWAPluginContext<any, any, any, any>,
  mapFile: (url: string) => string,
): () => AsyncGenerator<string | ManifestEntry, undefined, void> {
  const consumerGenerator = ctx.consumerOptions.additionalManifestEntriesGenerator
  return async function* additionalManifestEntries(): AsyncGenerator<string | ManifestEntry, undefined, void> {
    if (ctx.resolvedOptions.includeManifestIcons || ctx.resolvedOptions.includeAssets || ctx.resolvedOptions.includeManifestScreenshots) {
      const manifest = ctx.resolvedOptions.manifest
      const [{ hash }, { readFile }] = await Promise.all([
        import('node:crypto'),
        import('node:fs/promises'),
      ])
      if (manifest) {
        if (ctx.resolvedOptions.includeManifestIcons) {
          yield {
            url: ctx.resolvedOptions.manifestFilename!,
            revision: hash('md5', generateWebManifestFile(ctx), { outputEncoding: 'hex' }),
          }
        }
        if (manifest.icons) {
          for (const icons of manifest.icons) {
            if (icons.src) {
              yield {
                url: icons.src,
                revision: hash('md5', await readFile(mapFile(icons.src)), { outputEncoding: 'hex' }),
              }
            }
          }
        }
        if (ctx.resolvedOptions.includeManifestScreenshots && manifest.shortcuts) {
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
        if (ctx.resolvedOptions.includeManifestScreenshots && manifest.screenshots) {
          for (const screenshot of manifest.screenshots) {
            yield {
              url: screenshot.src,
              revision: hash('md5', await readFile(mapFile(screenshot.src)), { outputEncoding: 'hex' }),
            }
          }
        }
        if (ctx.resolvedOptions.includeAssets) {
          const assets = typeof ctx.resolvedOptions.includeAssets === 'string' ? [ctx.resolvedOptions.includeAssets] : ctx.resolvedOptions.includeAssets
          for (const asset of assets) {
            yield {
              url: asset,
              revision: hash('md5', await readFile(mapFile(asset)), { outputEncoding: 'hex' }),
            }
          }
        }
      }

      if (consumerGenerator) {
        yield* consumerGenerator()
      }
    }
  }
}
