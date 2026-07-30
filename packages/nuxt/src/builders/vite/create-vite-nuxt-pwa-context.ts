import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { PwaModuleOptions } from '../../types'
import type { ViteNuxtPWAContext } from './internal-types'
import { createCustomVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import { prepareNuxtOptions } from './prepare-nuxt-options'

export function createViteNuxtPwaContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  nuxtVersion: string,
  buildAssetsDir: string,
  options: PwaModuleOptions<UserStrategy, T>,
  nuxt: Nuxt,
  moduleResolver: ReturnType<typeof import('@nuxt/kit')['createResolver']>,
): ViteNuxtPWAContext<UserStrategy, T> {
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
      'vite'
    >(
      'vite',
      true,
      pwaOptions,
    ),
    {
      nuxt: {
        prepareNuxtOptions: () => prepareNuxtOptions(ctx, nuxt),
        nuxtVersion,
        nitroConfig: undefined!,
        buildAssetsDir,
        client: useClient,
        experimental,
        registerWebManifestInRouteRules,
        writePlugin,
        publicDirs: [],
        moduleResolver,
      },
    },
  ) as ViteNuxtPWAContext<UserStrategy, T>

  return ctx
}
