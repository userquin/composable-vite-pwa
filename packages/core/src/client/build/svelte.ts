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
  } = options

  const needRefresh = writable(false)
  const offlineReady = writable(false)

  registerSW({
    immediate,
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
  }
}
