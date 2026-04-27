declare module 'virtual:pwa-register/react' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/vite-plugin-pwa/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when react is not installed
  import type { Dispatch, SetStateAction } from 'react'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: [boolean, Dispatch<SetStateAction<boolean>>]
    offlineReady: [boolean, Dispatch<SetStateAction<boolean>>]
    /**
     * Reloads the current window to allow the service worker take the control.
     *
     * @param reloadPage From version 0.13.2+ this param is not used anymore.
     */
    updateServiceWorker: (reloadPage?: boolean) => Promise<void>
  }
}
