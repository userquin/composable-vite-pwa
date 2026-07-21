import type { DevframeRpcClient } from 'devframe/client'
import type { PWAConfiguration, SWInfo } from '../state'
import { getDevToolsRpcClient } from '@vitejs/devtools-kit/client'

let rpcClient: DevframeRpcClient

async function loadPWAConfiguration() {
  return await rpcClient.call('unplugin-pwa:pwa-configuration')
}

async function loadSWInfo() {
  return await rpcClient.call('unplugin-pwa:service-worker-info')
}

export async function init(): Promise<{
  load: () => Promise<PWAConfiguration>
  sw: () => Promise<SWInfo>
}> {
  rpcClient = await getDevToolsRpcClient()
  return {
    load: loadPWAConfiguration,
    sw: loadSWInfo,
  }
}
