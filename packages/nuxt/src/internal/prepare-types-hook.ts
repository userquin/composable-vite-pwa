import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../internal-types'
import { getMajor } from 'verkit'

export function prepareTypesHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
): import('@nuxt/schema').NuxtHooks['prepare:types'] {
  return (context) => {
    const { references } = context
    references.push({ types: '@composable-vite-pwa/nuxt/configuration' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
    // check registerPwaIconsTypes
    references.push({ path: 'types/pwa-augments.d.ts' })
    if (getMajor(ctx.nuxt.nuxtVersion) >= 4) {
      context.nodeReferences.push({ types: '@composable-vite-pwa/nuxt/configuration' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
      // check registerPwaIconsTypes
      context.nodeReferences.push({ path: 'types/pwa-augments.d.ts' })
    }
  }
}
