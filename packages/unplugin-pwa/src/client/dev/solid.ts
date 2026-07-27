import type { RegisterSWOptions } from '../types'
import { createSignal } from 'solid-js'

export type { RegisterSWOptions }

export function useRegisterSW(_options: RegisterSWOptions = {}) {
  const needRefresh = createSignal(false)
  const offlineReady = createSignal(false)

  return {
    needRefresh,
    offlineReady,
    updateServiceWorker: () => Promise.resolve(),
  }
}
