import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import { getMajor } from 'verkit'

export function prepareTypesHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
  runtimeDir: string,
): import('@nuxt/schema').NuxtHooks['prepare:types'] {
  return (context) => {
    const { references } = context
    // references.push({ types: ctx.nuxt.moduleResolver.resolve(runtimeDir, 'augments.d.ts') })
    references.push({ types: '@composable-vite-pwa/nuxt/configuration' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
    // references.push({ types: '@vite-pwa/assets-generator/api' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
    /* for (
      const name of [
        'PwaAppleImage',
        'PwaAppleSplashScreenImage',
        'PwaFaviconImage',
        'PwaMaskableImage',
        'PwaTransparentImage',
      ]
    ) {
      references.push({ path: ctx.nuxt.moduleResolver.resolve(nuxt.options.buildDir, `pwa-icons/${name}Props.d.ts`) })
    } */
    if (getMajor(ctx.nuxt.nuxtVersion) >= 4) {
      context.nodeReferences.push({ types: '@composable-vite-pwa/nuxt/configuration' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
      // context.nodeReferences.push({ types: '@vite-pwa/assets-generator/api' })
      context.nodeReferences.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
    }
  }
}
