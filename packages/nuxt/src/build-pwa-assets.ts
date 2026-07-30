import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from './internal-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { generateWebManifest } from '@composable-vite-pwa/unplugin-pwa/node/generate-web-manifest'

export async function buildPwaAssets<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
) {
  const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
  if (pwaAssetsGenerator) {
    await pwaAssetsGenerator.generate()
    pwaAssetsGenerator.injectManifestIcons()
  }

  if (ctx.resolvedOptions.manifest) {
    const webManifest = generateWebManifest(ctx)
    await fs.writeFile(
      path.resolve(ctx.outDir, ctx.resolvedOptions.manifestFilename || 'manifest.webmanifest'),
      webManifest,
      'utf-8',
    )
  }

  if (!ctx.resolvedOptions.disable) {
    await ctx.runBuild()
  }
}
