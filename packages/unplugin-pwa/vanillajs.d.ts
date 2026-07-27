declare module 'virtual:pwa-register' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/unplugin-pwa/types'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  /**
   * Registers the service worker returning a callback to reload the current page when an update is found.
   *
   * @param options the options to register the service worker.
   * @return The callback to activate the new service worker.
   */
  export function registerSW(options?: RegisterSWOptions): () => Promise<void>
}
