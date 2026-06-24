import type { RegisterSWOptions } from '../types'
import { useEffect, useRef, useState } from 'react'
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

  const [needRefresh, setNeedRefresh] = useState(false)
  const [offlineReady, setOfflineReady] = useState(false)

  const registered = useRef(false)

  useEffect(() => {
    if (registered.current)
      return
    registered.current = true

    registerSW({
      immediate,
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
  }
}
