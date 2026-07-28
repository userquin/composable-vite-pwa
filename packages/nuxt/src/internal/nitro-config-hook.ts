import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'

export function nitroConfigHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPC,
  nuxt: Nuxt,
): import('@nuxt/schema').NuxtHooks['nitro:config'] {
  return (nitroConfig) => {
    ctx.nuxt.nitroConfig = nitroConfig

    if (nuxt.options.experimental.payloadExtraction) {
      ctx.nuxt.enableGlobPatterns = nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */
        || (
          !!nitroConfig.prerender?.routes?.length
          || Object.values(nitroConfig.routeRules ?? {}).some(r => r.prerender)
        )
    }
  }
}
