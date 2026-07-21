import type { PWAConfiguration, SWInfo } from '../state'
import { INSPECTOR_BASE_PATH_API } from '../../../src/node/constants'

export async function fetchMode(): Promise<'standalone' | 'vite-devtools'> {
  return await fetch(`${INSPECTOR_BASE_PATH_API}/mode`).then(res => res.json())
}
export async function fetchPWAConfiguration(): Promise<PWAConfiguration> {
  return await fetch(`${INSPECTOR_BASE_PATH_API}/`).then(res => res.json())
}
export async function fecthSWInfo(): Promise<SWInfo> {
  return await fetch(`${INSPECTOR_BASE_PATH_API}/sw`).then(res => res.json())
}
