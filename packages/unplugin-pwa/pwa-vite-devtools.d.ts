import '@vitejs/devtools-kit'

declare module '@vitejs/devtools-kit' {
  interface DevToolsRpcServerFunctions {
    'unplugin-pwa:pwa-configuration': () => Promise<{
      version: string
      base: string
      swEnabled: boolean
      strategy: import('@composable-vite-pwa/workbox-build/config/types').Strategy
      swType: import('@composable-vite-pwa/workbox-build/types').SWType
      swDevEnabled: boolean
      currentSWType: WorkerType
      swNames: import('@composable-vite-pwa/unplugin-pwa/node/context-types').DevSWNames
      manifest: Partial<import('@composable-vite-pwa/unplugin-pwa/node/types').ManifestOptions>
    }>
    'unplugin-pwa:service-worker-info': () => Promise<{
      swType?: WorkerType
      chunks?: string[]
      dependencies?: string[]
    }>
  }
}
