import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from './internal-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { generateWebManifest } from '@composable-vite-pwa/unplugin-pwa/node/generate-web-manifest'

export async function buildPwaAssets<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
  PC extends PWAPluginContext<B, UserStrategy, S, T>,
  NPWAC extends NuxtPWAContext<
    B,
    UserStrategy,
    S,
    T,
    PC
  >,
>(
  ctx: NPWAC,
) {
  const pwaAssetsGenerator = await ctx.pwaCtx.pwaAssetsGenerator
  if (pwaAssetsGenerator) {
    await pwaAssetsGenerator.generate()
    pwaAssetsGenerator.injectManifestIcons()
  }

  if (ctx.pwaCtx.resolvedOptions.manifest) {
    const webManifest = generateWebManifest(ctx.pwaCtx)
    await fs.writeFile(
      path.resolve(ctx.pwaCtx.outDir, ctx.pwaCtx.resolvedOptions.manifestFilename || 'manifest.webmanifest'),
      webManifest,
      'utf-8',
    )
  }

  if (!ctx.pwaCtx.resolvedOptions.disable) {
    await ctx.pwaCtx.runBuild()
  }
}
