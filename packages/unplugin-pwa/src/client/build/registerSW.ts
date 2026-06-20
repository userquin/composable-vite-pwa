import { isSWModuleSupported } from '@composable-vite-pwa/workbox-window/esm-sw-detector'

function registerSW() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      if (import.meta.PWA_ESM_FALLBACK_SW) {
        if (isSWModuleSupported()) {
          navigator.serviceWorker.register(import.meta.PWA_SW_MODULE_URL, {
            scope: import.meta.PWA_SW_SCOPE,
            type: 'module',
            updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
          })
        }
        else {
          navigator.serviceWorker.register(import.meta.PWA_SW_CLASSIC_URL, {
            scope: import.meta.PWA_SW_SCOPE,
            type: 'classic',
            updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
          })
        }
      }
      else {
        navigator.serviceWorker.register(import.meta.PWA_SW_URL, {
          scope: import.meta.PWA_SW_SCOPE,
          type: 'module',
          updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
        })
      }
    })
  }
}

registerSW()
