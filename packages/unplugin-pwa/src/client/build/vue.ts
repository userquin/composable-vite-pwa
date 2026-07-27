import type { RegisterSWOptions } from '../types'
import { shallowRef } from 'vue'
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

  const needRefresh = shallowRef(false)
  const offlineReady = shallowRef(false)

  const updateServiceWorker = registerSW({
    immediate,
    trustedScriptUrl,
    updateViaCache,
    onNeedReload,
    onNeedRefresh() {
      needRefresh.value = true
      onNeedRefresh?.()
    },
    onOfflineReady() {
      offlineReady.value = true
      onOfflineReady?.()
    },
    onRegisteredSW,
    onRegisterError,
  })

  return {
    offlineReady,
    needRefresh,
    updateServiceWorker,
  }
}
