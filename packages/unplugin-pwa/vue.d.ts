declare module 'virtual:pwa-register/vue' {
  import type { PWATrustedScriptURL, RegisterSWOptions } from '@composable-vite-pwa/unplugin-pwa/types'
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-ignore ignore when vue is not installed
  import type { Ref } from 'vue'

  export type { PWATrustedScriptURL, RegisterSWOptions }

  export function useRegisterSW(options?: RegisterSWOptions): {
    needRefresh: Ref<boolean>
    offlineReady: Ref<boolean>
    /**
     * Reloads the current window to allow the service worker take the control.
     */
    updateServiceWorker: () => Promise<void>
  }
}
