import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NitroConfig } from 'nitropack'
import type { ClientOptions } from './types'

export interface NuxtPWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
  OC extends PWAPluginContext<B, UserStrategy, S, T>,
> {
  nuxtVersion: string
  nitroConfig: NitroConfig
  pwaCtx: OC
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
