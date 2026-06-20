declare module 'virtual:pwa-register/preact' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/unplugin-pwa/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when preact/hooks is not installed
  import type { Dispatch, StateUpdater } from 'preact/hooks'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<StateUpdater<boolean>>]
    offlineReady: [boolean, Dispatch<StateUpdater<boolean>>]
    /**
     * Reloads the current window to allow the service worker take the control.
     */
    updateServiceWorker: () => Promise<void>
  }
}
