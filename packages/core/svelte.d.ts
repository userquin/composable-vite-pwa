declare module 'virtual:pwa-register/svelte' {
  import type { RegisterSWOptions, SWScriptURL } from '@composable-vite-pwa/core/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when svelte is not installed
  import type { Writable } from 'svelte/store'

  export type { RegisterSWOptions, SWScriptURL }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: Writable<boolean>
    offlineReady: Writable<boolean>
    /**
     * Reloads the current window to allow the service worker take the control.
     *
     * @param reloadPage From version 0.13.2+ this param is not used anymore.
     */
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
