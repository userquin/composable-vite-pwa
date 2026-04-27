declare module 'virtual:pwa-register/solid' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/vite-plugin-pwa/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when solid-js is not installed
  import type { Accessor, Setter } from 'solid-js'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [Accessor<boolean>, Setter<boolean>]
    offlineReady: [Accessor<boolean>, Setter<boolean>]
    /**
     * Reloads the current window to allow the service worker take the control.
     *
     * @param reloadPage From version 0.13.2+ this param is not used anymore.
     */
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
