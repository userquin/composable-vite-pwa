declare module 'virtual:pwa-register/svelte' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/vite-plugin-pwa/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when svelte is not installed
  import type { Writable } from 'svelte/store'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: Writable<boolean>
    offlineReady: Writable<boolean>
    /**
     * Reloads the current window to allow the service worker take the control.
     */
    updateServiceWorker: () => Promise<void>
  }
}
