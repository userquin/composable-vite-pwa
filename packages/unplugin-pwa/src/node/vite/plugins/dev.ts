import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/types'
import type { ViteBundler, VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/vite/vite-context'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'

export function DevPlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(_ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): PluginOption {
  return {
    name: 'unplugin-pwa:dev',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
  }
}
