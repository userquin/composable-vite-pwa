interface WebpackHot {
  accept: (callback?: () => void) => void
}

const hot = (import.meta as ImportMeta & { webpackHot?: WebpackHot }).webpackHot

export function registerDevSW() {
  if (!('serviceWorker' in navigator))
    return

  const dualWorker = import.meta.PWA_ESM_FALLBACK_SW
  const type = dualWorker ? import.meta.PWA_DEV_CURRENT_SW_TYPE : import.meta.PWA_SW_TYPE
  const url = dualWorker
    ? type === 'module' ? import.meta.PWA_SW_MODULE_URL : import.meta.PWA_SW_CLASSIC_URL
    : import.meta.PWA_SW_URL

  navigator.serviceWorker.register(url, {
    scope: import.meta.PWA_SW_SCOPE,
    type,
    updateViaCache: import.meta.PWA_SW_UPDATE_VIA_CACHE,
  }).catch(error => console.error('[unplugin-pwa] Unable to register the development service worker', error))
}

export function setDevPWASwitcherReady() {
  window.setDevPWASwitcherReady?.()
}

hot?.accept(() => registerDevSW())
