import type { RegisterSWOptions } from '../types'
import { writable } from 'svelte/store'
import { registerSW } from './register'

export type { RegisterSWOptions }

export function useRegisterSW(options: RegisterSWOptions = {}) {
  const {
    immediate = true,
    onNeedReload,
    onNeedRefresh,
    onOfflineReady,
    onRegisteredSW,
    onRegisterError,
    trustedScriptUrl,
    updateViaCache,
  } = options

  const needRefresh = writable(false)
  const offlineReady = writable(false)

  const updateServiceWorker = registerSW({
    immediate,
    trustedScriptUrl,
    updateViaCache,
    onNeedReload,
    onOfflineReady() {
      offlineReady.set(true)
      onOfflineReady?.()
    },
    onNeedRefresh() {
      needRefresh.set(true)
      onNeedRefresh?.()
    },
    onRegisteredSW,
    onRegisterError,
  })

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker,
  }
}
