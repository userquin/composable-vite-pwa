import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'

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
