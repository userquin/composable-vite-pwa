import type { PWAPluginContext } from '../context-types'
import type { AssetsGeneratorContext } from './types'
import { generateManifestIconsEntry } from '@vite-pwa/assets-generator/api/generate-manifest-icons-entry'

export function injectManifestIcons(
  ctx: PWAPluginContext<any, any, any, any>,
  assetsGeneratorContext: AssetsGeneratorContext,
) {
  if (!assetsGeneratorContext.overrideManifestIcons)
    return

  const manifest = ctx.resolvedOptions.manifest
  if (manifest) {
    manifest.icons = generateManifestIconsEntry(
      'object',
      assetsGeneratorContext.assetsInstructions,
    ).icons
  }
}
