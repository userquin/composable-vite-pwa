import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'

export function buildDoneHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
): import('@nuxt/schema').NuxtHooks['build:done'] {
  return async () => {
    const devOptions = ctx.resolvedOptions.devOptions

    if (nuxt.options.dev && devOptions && devOptions.inspector) {
      console.log('nuxt build:done')
      await ctx.hooks.callHook('context:ready')
    }
  }
}
