import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from './internal-types'
import process from 'node:process'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'
import {
  normalizeManifest,
  preparePWAAssetsGenerator,
  preparePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/helpers'

export async function loadPwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, S, T> | ViteLegacyNuxtPWAContext<UserStrategy, S, T>,
): Promise<void> {
  const resolvedOptions = await resolvePwaConfiguration(
    ctx.pwaCtx.consumerOptions,
  )
  ctx.pwaCtx.resolvedOptions = resolvedOptions as unknown as any
}

export async function initPwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, S, T> | ViteLegacyNuxtPWAContext<UserStrategy, S, T>,
  nuxt: Nuxt,
) {
  normalizeManifest(ctx.pwaCtx)
  preparePWAAssetsGenerator(ctx.pwaCtx)
  switch (ctx.pwaCtx.strategy) {
    case 'build-sw':
      ctx.pwaCtx.resolvedOptions.buildSW!.alias = nuxt.options.alias
      break
  }
  if (nuxt.options.dev) {
    // const cwd = resolveAlias('~~')
    preparePWAStrategy(
      ctx.pwaCtx,
      process.cwd(),
      ctx.pwaCtx.dev.options.tempFolder,
      nuxt.options.app.buildAssetsDir ?? '_nuxt/',
    )
  }
  else {
    preparePWAStrategy(
      ctx.pwaCtx,
      process.cwd(),
      ctx.pwaCtx.outDir,
      nuxt.options.app.buildAssetsDir ?? '_nuxt/',
    )
  }
}
