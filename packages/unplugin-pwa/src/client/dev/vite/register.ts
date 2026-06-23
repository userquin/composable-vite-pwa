import type { TrustedScriptURL } from 'trusted-types/lib'
import type { RegisterSWOptions } from '../../types'
import { isServiceWorkerModuleSupported } from '@composable-vite-pwa/workbox-window/esm-sw-detector'

export function registerSW(options: RegisterSWOptions = {}) {
  const {
    immediate = false,
    trustedScriptUrl,
    onNeedReload,
    onNeedRefresh,
    onOfflineReady,
    onRegisteredSW,
    onRegisterError,
    updateViaCache = import.meta.PWA_SW_UPDATE_VIA_CACHE || 'imports',
  } = options

  let wb: import('@composable-vite-pwa/workbox-window').Workbox | undefined

  let useSWURL: string | TrustedScriptURL = import.meta.PWA_SW_URL
  let useSWType = import.meta.PWA_SW_TYPE

  async function register() {
    if ('serviceWorker' in navigator) {
      wb = await import('@composable-vite-pwa/workbox-window').then(({ Workbox }) => {
        if (import.meta.PWA_ESM_FALLBACK_SW) {
          const enableSwitcher = isServiceWorkerModuleSupported()
          const esmSW = import.meta.hot
            ? enableSwitcher && import.meta.PWA_DEV_CURRENT_SW_TYPE === 'module'
            : isServiceWorkerModuleSupported()

          // update entries
          if (esmSW) {
            useSWType = 'module'
            useSWURL = import.meta.PWA_SW_MODULE_URL
          }
          else {
            useSWType = 'classic'
            useSWURL = import.meta.PWA_SW_CLASSIC_URL
          }
          if (trustedScriptUrl) {
            if (typeof trustedScriptUrl === 'function') {
              useSWURL = trustedScriptUrl(useSWType === 'classic', useSWURL as string)
            }
            else {
              throw new TypeError('Cannot use fixed TrustedScriptURL at RegisterSWOptions when enabling dual service worker registration (classic and module), use a callback!')
            }
          }
        }
        else {
          if (trustedScriptUrl) {
            if (typeof trustedScriptUrl === 'function') {
              useSWURL = trustedScriptUrl(useSWType === 'classic', import.meta.PWA_SW_URL)
            }
            else {
              useSWURL = trustedScriptUrl
            }
          }
        }
        return new Workbox(useSWURL, {
          scope: import.meta.PWA_SW_SCOPE,
          type: useSWType,
          updateViaCache,
        })
      }).catch((e) => {
        onRegisterError?.(e)
        return undefined
      })

      if (!wb)
        return

      if (!import.meta.PWA_SELF_DESTROYING_SW) {
        if (import.meta.PWA_SW_AUTO_UPDATE) {
          wb.addEventListener('activated', (event) => {
            if (event.isUpdate || event.isExternal) {
              if (onNeedReload)
                onNeedReload()
              else
                window.location.reload()
            }
          })
          wb.addEventListener('installed', (event) => {
            if (!event.isUpdate) {
              onOfflineReady?.()
            }
          })
        }
        else {
          let onNeedRefreshCalled = false
          const showSkipWaitingPrompt = () => {
            onNeedRefreshCalled = true
            // \`event.wasWaitingBeforeRegister\` will be false if this is
            // the first time the updated service worker is waiting.
            // When \`event.wasWaitingBeforeRegister\` is true, a previously
            // updated service worker is still waiting.
            // You may want to customize the UI prompt accordingly.

            // Assumes your app has some sort of prompt UI element
            // that a user can either accept or reject.
            // Assuming the user accepted the update, set up a listener
            // that will reload the page as soon as the previously waiting
            // service worker has taken control.
            wb?.addEventListener('controlling', (event) => {
              if (event.isUpdate) {
                if (onNeedReload)
                  onNeedReload()
                else
                  window.location.reload()
              }
            })

            onNeedRefresh?.()
          }
          wb.addEventListener('installed', (event) => {
            if (typeof event.isUpdate === 'undefined') {
              if (typeof event.isExternal !== 'undefined') {
                if (event.isExternal)
                  showSkipWaitingPrompt()
                else
                  !onNeedRefreshCalled && onOfflineReady?.()
              }
              else {
                !onNeedRefreshCalled && onOfflineReady?.()
              }
            }
            else if (!event.isUpdate) {
              onOfflineReady?.()
            }
          })
          // Add an event listener to detect when the registered
          // service worker has installed but is waiting to activate.
          wb.addEventListener('waiting', showSkipWaitingPrompt)
        }
      }

      // register the service worker
      wb.register({ immediate }).then((r) => {
        if (import.meta.PWA_ESM_FALLBACK_SW) {
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
          r && activatePWASwitcher(r)
        }
        onRegisteredSW?.(useSWURL.toString(), r)
      }).catch((e) => {
        onRegisterError?.(e)
      })
    }
  }

  register().then(() => {})
}
