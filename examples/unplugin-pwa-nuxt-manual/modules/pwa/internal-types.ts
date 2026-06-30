import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NitroConfig } from 'nitropack'
import type { ClientOptions } from './types'

export interface NuxtPWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends PWAPluginContext<B, UserStrategy, T> {
  nuxt: {
    nuxtVersion: string
    nitroConfig: NitroConfig
    buildAssetsDir: string
    enableGlobPatterns?: boolean
    appManifestFolder?: string
    client: Required<ClientOptions>
    loadPwaConfiguration: () => Promise<void>
    initPwaConfiguration: () => Promise<void>
    prepareNuxtOptions: () => Promise<void>
    experimental?: {
      enableWorkboxPayloadQueryParams?: true
    }
    registerWebManifestInRouteRules?: boolean
    /**
     * Writes the plugin to disk: defaults to false (debug).
     */
    writePlugin?: boolean
  }
}
