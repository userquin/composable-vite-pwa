declare global {
  interface ImportMeta {
    PWA_ESM_FALLBACK_SW: boolean
    PWA_SELF_DESTROYING_SW: boolean
    PWA_SW_URL: string
    PWA_SW_CLASSIC_URL: string
    PWA_SW_MODULE_URL: string
    PWA_SW_SCOPE: string
    PWA_SW_TYPE: WorkerType
    PWA_SW_UPDATE_VIA_CACHE: ServiceWorkerUpdateViaCache | undefined
    PWA_DEV_SERVER: boolean
    PWA_SW_AUTO_UPDATE: boolean
    PWA_DEV_ENABLED: boolean
    PWA_DEV_UI_ENABLED: boolean
    // HMR
    PWA_DEV_REGISTER_SW_EVENT_NAME: string
    PWA_DEV_PWA_ASSETS_EVENT_NAME: string
    PWA_DEV_READY_EVENT_NAME: string
    PWA_DEV_PWA_SWITCHER_EVENT_NAME: string
    PWA_DEV_CURRENT_SW_TYPE: WorkerType
  }
}

export {}
