import type { RegisterSWOptions } from '../types'
import { useEffect, useRef, useState } from 'react'
import { registerSW } from './register'

export type { RegisterSWOptions }

type UpdateServiceWorker = ReturnType<typeof registerSW>

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

  const registered = useRef(false)
  const updateServiceWorkerRef = useRef<UpdateServiceWorker>(undefined)

  const [updateServiceWorker] = useState<UpdateServiceWorker>(() => {
    return async (...args) => {
      await updateServiceWorkerRef.current?.(...args)
    }
  })

  useEffect(() => {
    if (registered.current) {
      return
    }

    registered.current = true
    updateServiceWorkerRef.current = registerSW({
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
  }, [])

  return {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  }
}
