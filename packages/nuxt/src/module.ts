import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { PWATrustedScriptURL, TrustedScriptURL } from '@composable-vite-pwa/unplugin-pwa/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { HookResult } from '@nuxt/schema'
import type { PwaModuleHooks, PwaModuleOptions } from './types'
import { createResolver, defineNuxtModule } from '@nuxt/kit'

export type * from './types'

export type ModuleOptions = PwaModuleOptions<VitePWAStrategy, SWType>

export type ModuleHooks = PwaModuleHooks

export interface PWAModuleRuntimeHooks {
  /**
   * Emitted before service worker registration to allow use `TrustedScriptURL`
   * @param url The url.
   * @param swType The current service worker type.
   * @param withTrustedScriptUrl The callback to change the configuration.
   */
  'service-worker:before-register': (
    withTrustedScriptUrl: (trustedScriptUrl?: TrustedScriptURL | PWATrustedScriptURL) => void,
  ) => HookResult
  /**
   * Emitted when the service worker is registered
   * @param data The url and the optional service worker registration object
   */
  'service-worker:registered': (data: {
    url: string
    registration?: ServiceWorkerRegistration
  }) => HookResult
  /**
   * Emitted when the service worker registration fails
   * @param data The optional error object
   */
  'service-worker:registration-failed': (data: {
    error?: unknown
  }) => HookResult
  /**
   * Emitted when the service worker is activated
   * @param data The url and the service worker registration object
   */
  'service-worker:activated': (data: {
    url: string
    registration: ServiceWorkerRegistration
  }) => HookResult
}

export type ModuleRuntimeHooks = PWAModuleRuntimeHooks

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@vite-pwa/nuxt',
    configKey: 'pwa',
    compatibility: {
      nuxt: '>=3.6.5',
    },
  },
  defaults: nuxt => ({
    base: nuxt.options.app.baseURL,
    scope: nuxt.options.app.baseURL,
    injectRegister: false,
    includeManifestIcons: false,
    registerPlugin: true,
    writePlugin: false,
    client: {
      registerPlugin: true,
      installPrompt: false,
      periodicSyncForUpdates: 0,
    },
  }),
  async setup(options, nuxt) {
    const [createNuxtPwaContext, prepareModule] = await Promise.all([
      import('./create-nuxt-pwa-context').then(({
        createNuxtPwaContext,
      }) => createNuxtPwaContext),
      import('./prepare-module').then(({
        prepareModule,
      }) => prepareModule),
    ])
    await createNuxtPwaContext(
      options,
      nuxt,
      createResolver(import.meta.url),
    ).then(config => prepareModule(
      config,
      nuxt,
    ))
  },
})
