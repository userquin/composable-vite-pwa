import type { TrustedScriptURL } from 'trusted-types/lib'
import type { PWATrustedScriptURL, RegisterSWOptions } from '../types'
import { isSWModuleSupported } from '../esm-sw-detector'

const swUrl = __SW_URL__
const scope = __SW_SCOPE__
const swType = __SW_TYPE__
const auto = __SW_AUTO_UPDATE__
const autoDestroy = __SW_SELF_DESTROYING__
const updateViaCache = __SW_UPDATE_VIA_CACHE__

export type { PWATrustedScriptURL, RegisterSWOptions }

export function registerSW(options: RegisterSWOptions = {}) {
  const {
    immediate = false,
    trustedScriptUrl,
    supportsESM,
    onNeedReload,
    onNeedRefresh,
    onOfflineReady,
    onRegisteredSW,
    onRegisterError,
  } = options

  let wb: import('@composable-vite-pwa/workbox-window').Workbox | undefined

  let useSWURL: string | TrustedScriptURL = swUrl
  let useSWType = swType

  async function register() {
    if ('serviceWorker' in navigator) {
      wb = await import('@composable-vite-pwa/workbox-window').then(({ Workbox }) => {
        // eslint-disable-next-line node/prefer-global/process
        if (process.env.VITE_PWA_ESM_FALLBACK_SW) {
          // By default, vite SW build will use classic and the sw.js will be the ESM version.
          // We're generating 2 variants: <sw>.js and classic-<sw>.js.
          if (supportsESM?.() || isSWModuleSupported()) {
            useSWType = 'module'
          }
          else {
            const isAbsolute = swUrl.startsWith('/')
            const parts = (isAbsolute ? swUrl.slice(1) : swUrl).split('/')
            const fileName = parts.pop()
            const path = parts.join('/')
            useSWURL = `${isAbsolute ? '/' : ''}${path ? `${path}/` : ''}classic-${fileName}`
            useSWType = 'classic'
          }
          if (trustedScriptUrl) {
            if (typeof trustedScriptUrl === 'function') {
              useSWURL = trustedScriptUrl(useSWURL as string)
            }
            else {
              throw new TypeError('Cannot use fixed TrustedScriptURL at RegisterSWOptions when enabling dual service worker registration (classic and module), use a callback!')
            }
          }
        }
        else {
          if (trustedScriptUrl) {
            if (typeof trustedScriptUrl === 'function') {
              useSWURL = trustedScriptUrl(swUrl)
            }
            else {
              useSWURL = trustedScriptUrl
            }
          }
        }
        return new Workbox(useSWURL, { scope, type: useSWType, updateViaCache })
      }).catch((e) => {
        onRegisterError?.(e)
        return undefined
      })

      if (!wb)
        return

      if (!autoDestroy) {
        if (auto) {
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
        onRegisteredSW?.(useSWURL.toString(), r)
      }).catch((e) => {
        onRegisterError?.(e)
      })
    }
  }

  register().then(() => {})
}
