import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { PwaModuleOptions } from '../../types'
import type { ViteNuxtPWAContext } from './internal-types'
import { createCustomVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import { prepareNuxtOptions } from './prepare-nuxt-options'
import { initPwaConfiguration, loadPwaConfiguration } from './pwa-configuration'

export function createViteNuxtPwaContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  nuxtVersion: string,
  buildAssetsDir: string,
  options: PwaModuleOptions<UserStrategy, T>,
  nuxt: Nuxt,
): ViteNuxtPWAContext<UserStrategy, S, T> {
  const {
    experimental,
    registerWebManifestInRouteRules,
    writePlugin,
    client = {},
    ...pwaOptions
  } = options

  const useClient = Object.assign(
    {},
    {
      registerPlugin: true,
      installPrompt: false,
      periodicSyncForUpdates: 0,
    },
    client,
  )

  const ctx: ViteNuxtPWAContext<UserStrategy, S, T> = {
    pwaCtx: createCustomVitePWAContext<
      UserStrategy,
      S,
      T,
      'vite'
    >(
      'vite',
      true,
      pwaOptions,
    ),
    loadPwaConfiguration: () => loadPwaConfiguration(ctx),
    initPwaConfiguration: () => initPwaConfiguration(ctx, nuxt),
    prepareNuxtOptions: () => prepareNuxtOptions(ctx, nuxt),
    nuxtVersion,
    nitroConfig: undefined!,
    buildAssetsDir,
    client: useClient,
    experimental,
    registerWebManifestInRouteRules,
    writePlugin,
  }

  return ctx
}
