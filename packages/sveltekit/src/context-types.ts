import type {
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'

import type {
  KitOptions,
  SvelteKitConfig,
} from './types'

export interface SvelteKitPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends VitePWAPluginContext<'vite', UserStrategy, T> {
  kitConfig?: SvelteKitConfig
  kitOptions?: KitOptions
}
