import type { RegisterSWOptions } from '../types'
import { useState } from 'react'
import { registerSW } from './register'

export type { RegisterSWOptions }

/**
 * Registers the service worker.
 * @param options The options.
 * @deprecated use `react` instead
 */
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

  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  registerSW({
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
  }
}
