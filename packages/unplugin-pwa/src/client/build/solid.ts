import type { RegisterSWOptions } from '../types'
import { createSignal } from 'solid-js'
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

  const [needRefresh, setNeedRefresh] = createSignal(false)
  const [offlineReady, setOfflineReady] = createSignal(false)

  const updateServiceWorker = registerSW({
    immediate,
    trustedScriptUrl,
    updateViaCache,
    onNeedReload,
    onOfflineReady() {
      setOfflineReady(true)
      onOfflineReady?.()
    },
    onNeedRefresh() {
      setNeedRefresh(true)
      onNeedRefresh?.()
    },
    onRegisteredSW,
    onRegisterError,
  })

  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  }
}
