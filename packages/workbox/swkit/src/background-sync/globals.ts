// See https://github.com/GoogleChrome/workbox/issues/2946
interface SyncManager {
  getTags: () => Promise<string[]>
  register: (tag: string) => Promise<void>
}

declare global {
  interface ServiceWorkerRegistration {
    readonly sync: SyncManager
  }
  interface SyncEvent extends ExtendableEvent {
    readonly lastChance: boolean
    readonly tag: string
  }
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent
  }
}

export {}
