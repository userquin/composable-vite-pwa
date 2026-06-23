import { isServiceWorkerModuleSupported } from '@composable-vite-pwa/workbox-window/esm-sw-detector'

if ('serviceWorker' in navigator) {
  if (import.meta.PWA_ESM_FALLBACK_SW) {
    if (import.meta.hot) {
      const enableSwitcher = isServiceWorkerModuleSupported()
      function activatePWASwitcher(registration: ServiceWorkerRegistration) {
        if (!enableSwitcher) {
          console.warn(`[VITE PWA] Service Worker UI switcher has been activated, the browser doesn't support ESM!`)
          return
        }
        if (registration.active) {
          if (typeof window.setDevPWASwitcherReady === 'function') {
            window.setDevPWASwitcherReady()
          }
          else {
            setTimeout(() => {
              if (typeof window.setDevPWASwitcherReady === 'function') {
                window.setDevPWASwitcherReady()
              }
            }, 300)
          }
          return
        }

        const sw = registration.installing || registration.waiting
        if (sw) {
          sw.addEventListener('statechange', () => {
            if (sw.state === 'activated') {
              if (typeof window.setDevPWASwitcherReady === 'function') {
                window.setDevPWASwitcherReady()
              }
              else {
                setTimeout(() => {
                  if (typeof window.setDevPWASwitcherReady === 'function') {
                    window.setDevPWASwitcherReady()
                  }
                }, 300)
              }
            }
          })
        }
      }
      if (enableSwitcher && import.meta.PWA_DEV_CURRENT_SW_TYPE === 'module') {
        navigator.serviceWorker.register(import.meta.PWA_SW_MODULE_URL, {
          scope: import.meta.PWA_SW_SCOPE,
          type: 'module',
          updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
        }).then(activatePWASwitcher)
      }
      else {
        navigator.serviceWorker.register(import.meta.PWA_SW_CLASSIC_URL, {
          scope: import.meta.PWA_SW_SCOPE,
          type: 'classic',
          updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
        }).then(activatePWASwitcher)
      }
    }
    else {
      if (isServiceWorkerModuleSupported()) {
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
  }
  else {
    navigator.serviceWorker.register(import.meta.PWA_SW_URL, {
      scope: import.meta.PWA_SW_SCOPE,
      type: import.meta.PWA_SW_TYPE,
      updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
    })
  }
}
