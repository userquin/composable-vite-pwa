import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../internal-types'
import { addImports } from '@nuxt/kit'

export function prepareTypesHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  runtimeDir: string,
): import('@nuxt/schema').NuxtHooks['prepare:types'] {
  return ({ references }) => {
    references.push({ path: ctx.nuxt.moduleResolver.resolve(runtimeDir, 'plugins/types') })
    references.push({ types: '@composable-vite-pwa/nuxt/configuration.d.ts' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
    // nuxt will call imports:sources, imports:context, imports:extend before nitro hooks
    // then will call imports:extend after prepare:types
    // we don't have the pwa options resolved before nuxt calls nitro:init hook
    addImports([
      'usePWA',
      'useTransparentPwaIcon',
      'useMaskablePwaIcon',
      'useFaviconPwaIcon',
      'useApplePwaIcon',
      'useAppleSplashScreenPwaIcon',
    ].map(key => ({
      name: key,
      as: key,
      from: ctx.nuxt.moduleResolver.resolve(runtimeDir, 'composables/index'),
    })))
  }
}
