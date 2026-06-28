import './switcher'

interface PWADevRegisterSW {
  module: boolean
  mode?: 'inline' | 'script' | 'script-defer'
  inlinePath: string
  registerPath: string
  scope: string
  swType?: WorkerType
}

interface PWADevAssets {
  themeColor?: {
    name: string
    content: string
  }
  links?: {
    id?: string
    rel: 'apple-touch-startup-image' | 'apple-touch-icon' | 'icon'
    href: string
    media?: string
    sizes?: string
    type?: string
  }[]
}

import.meta.hot?.on(
  import.meta.PWA_DEV_REGISTER_SW_EVENT_NAME,
  ({
    module,
    mode,
    inlinePath,
    registerPath,
    scope,
    swType = 'classic',
  }: PWADevRegisterSW) => {
    if (mode === 'inline') {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register(inlinePath, { scope, type: swType })
      }
    }
    else {
      const registerSW = document.createElement('script')
      registerSW.setAttribute('id', 'unplugin-pwa:register-sw')
      if (mode === 'script-defer') {
        registerSW.setAttribute('defer', 'defer')
      }
      if (module) {
        registerSW.setAttribute('type', 'module')
      }
      registerSW.setAttribute('src', registerPath)
      document.head.appendChild(registerSW)
    }
  },
)

import.meta.hot?.on(
  import.meta.PWA_DEV_PWA_ASSETS_EVENT_NAME,
  ({
    themeColor,
    links,
  }: PWADevAssets) => {
    if (themeColor) {
      const metaThemeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      if (metaThemeColor) {
        metaThemeColor.content = themeColor.content
      }
      else {
        const meta = document.createElement('meta')
        meta.setAttribute('name', 'theme-color')
        meta.setAttribute('content', themeColor.content)
        document.head.appendChild(meta)
      }
    }
    if (links) {
      for (const l of links) {
        const link = document.querySelector(`link[href="${l.href}"]`) ?? document.createElement('link')
        if (l.id) {
          link.setAttribute('id', l.id)
        }
        else {
          link.removeAttribute('id')
        }
        link.setAttribute('rel', l.rel)
        link.setAttribute('href', l.href)
        if (l.media) {
          link.setAttribute('media', l.media)
        }
        else {
          link.removeAttribute('media')
        }
        if (l.sizes) {
          link.setAttribute('sizes', l.sizes)
        }
        else {
          link.removeAttribute('sizes')
        }
        if (l.type) {
          link.setAttribute('type', l.type)
        }
        else {
          link.removeAttribute('type')
        }
        if (!link.parentNode) {
          document.head.appendChild(link)
        }
      }
    }
  },
)

export function registerDevSW() {
  try {
    import.meta.hot?.send(import.meta.PWA_DEV_READY_EVENT_NAME)
  }
  catch (e) {
    console.error(`unable to send ${import.meta.PWA_DEV_READY_EVENT_NAME} message to register service worker in dev mode!`, e)
  }
}

export function setDevPWASwitcherReady() {
  window.setDevPWASwitcherReady?.()
}
