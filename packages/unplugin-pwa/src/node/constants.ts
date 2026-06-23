export const FILE_SW_REGISTER = 'registerSW.js'

export const VIRTUAL_MODULES_MAP: Record<string, string> = {
  'virtual:pwa-register': 'register',
  'virtual:pwa-register/vue': 'vue',
  'virtual:pwa-register/svelte': 'svelte',
  'virtual:pwa-register/react': 'react',
  'virtual:pwa-register/react-effect': 'react-effect',
  'virtual:pwa-register/preact': 'preact',
  'virtual:pwa-register/solid': 'solid',
}
export const VIRTUAL_MODULES_RESOLVE_PREFIX = '/@unplugin-pwa/'
export const VIRTUAL_MODULES = Object.keys(VIRTUAL_MODULES_MAP)

export const PWA_INFO_VIRTUAL = 'virtual:pwa-info'
export const RESOLVED_PWA_INFO_VIRTUAL = `\0${PWA_INFO_VIRTUAL}`
export const PWA_ASSETS_HEAD_VIRTUAL = 'virtual:pwa-assets/head'
export const RESOLVED_PWA_ASSETS_HEAD_VIRTUAL = `\0${PWA_ASSETS_HEAD_VIRTUAL}`
export const PWA_ASSETS_ICONS_VIRTUAL = 'virtual:pwa-assets/icons'
export const RESOLVED_PWA_ASSETS_ICONS_VIRTUAL = `\0${PWA_ASSETS_ICONS_VIRTUAL}`

// todo: remove DEV_SW_NAME
export const DEV_SW_NAME = 'dev-sw.js?dev-sw'
export const DEV_SW_VIRTUAL = `${VIRTUAL_MODULES_RESOLVE_PREFIX}pwa-entry-point-loaded`
export const RESOLVED_DEV_SW_VIRTUAL = `\0${DEV_SW_VIRTUAL}`
export const DEV_READY_NAME = 'unplugin-pwa:dev-ready'
export const DEV_REGISTER_SW_NAME = 'unplugin-pwa:register-sw'
export const DEV_PWA_ASSETS_NAME = 'unplugin-pwa:pwa-assets'
export const DEV_SWITCHER_NAME = 'unplugin-pwa:pwa-switcher'
