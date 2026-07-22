import type { PWAConfiguration, SWInfo } from './state'
import { fecthSWInfo, fetchMode, fetchPWAConfiguration } from './api/fetcher'
import { currentSWInfo, pwaConfiguration, ready } from './state'

let api: {
  load: () => Promise<PWAConfiguration>
  sw: () => Promise<SWInfo>
}

async function initApi(): Promise<void> {
  if (!api) {
    let mode: 'standalone' | 'vite-devtools'
    try {
      mode = await fetchMode()
    }
    catch {
      mode = 'standalone'
    }
    if (mode === 'vite-devtools') {
      try {
        api = await import('./api/devtools').then(({
          init,
        }) => init())
      }
      catch {
        api = {
          load: fetchPWAConfiguration,
          sw: fecthSWInfo,
        }
      }
    }
    else {
      api = {
        load: fetchPWAConfiguration,
        sw: fecthSWInfo,
      }
    }
  }
}

export async function loadPWAConfiguration(): Promise<void> {
  await initApi()
  pwaConfiguration.value = await api.load()
  ready.value = true
}

export async function loadSWInfo(): Promise<void> {
  await initApi()

  currentSWInfo.value = await api.sw()
}
