import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NitroConfig } from 'nitropack'
import type { ClientOptions } from './types'

export interface NitroPWAOptions {
  publicAssets: {
    baseURL?: string
    fallthrough?: boolean
    maxAge: number
    dir: string
  }[]
  routeRules: Record<string, Record<string, any>>
}

export interface NuxtPWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends PWAPluginContext<B, UserStrategy, T> {
  nuxt: {
    nuxtVersion: string
    nitroConfig: NitroConfig
    nitroPWAOptions: NitroPWAOptions
    publicDirs: string[]
    buildAssetsDir: string
    enableGlobPatterns?: boolean
    appManifestFolder?: string
    client: Required<ClientOptions>
    /**
     * Called at `nitro:init` hook if builder requires adding some custom PWA options.
     */
    preparePwaConfiguration?: () => Promise<void> | void
    /**
     * Configure builder specific options, called at `build:done` hook.
     */
    prepareNuxtOptions: () => Promise<void> | void
    /**
     * The resolver using the module path.
     */
    moduleResolver: ReturnType<typeof import('@nuxt/kit')['createResolver']>
    experimental?: {
      /**
       * @deprecated use `enableWorkboxPayloadQueryParams` instead.
       */
      enableWorkboxPayloadQueryParams?: true
      /**
       * When using `generateSW/generate-sw` strategy, enabling this option will add a runtime caching
       * when using `nitro.options.static` or `generate` nuxt command for payload.json files.
       */
      enableGenerateSWPayloadQueryParams?: true
    }
    /**
     * Should add nitro route rules for the web manifest?.
     */
    registerWebManifestInRouteRules?: boolean
    /**
     * Writes the plugin to disk: defaults to false (debug).
     */
    writePlugin?: boolean
  }
}
