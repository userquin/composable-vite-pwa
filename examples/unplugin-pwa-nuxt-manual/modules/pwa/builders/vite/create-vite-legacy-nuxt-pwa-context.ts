import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { PwaModuleOptions } from '../../types'
import type { ViteLegacyNuxtPWAContext } from './internal-types'
import {
  createCustomVitePWAContext,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import { prepareNuxtOptions } from './prepare-nuxt-options'
import { initPwaConfiguration, loadPwaConfiguration } from './pwa-configuration'

export function createViteLegacyNuxtPwaContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  nuxtVersion: string,
  buildAssetsDir: string,
  options: PwaModuleOptions<UserStrategy, T>,
  nuxt: Nuxt,
): ViteLegacyNuxtPWAContext<UserStrategy, T> {
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

  const ctx = Object.assign(
    createCustomVitePWAContext<
      UserStrategy,
      T,
      'vite-legacy'
    >(
      'vite-legacy',
      false,
      pwaOptions,
    ),
    {
      nuxt: {
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
      },
    },
  ) as ViteLegacyNuxtPWAContext<UserStrategy, T>

  return ctx
}
