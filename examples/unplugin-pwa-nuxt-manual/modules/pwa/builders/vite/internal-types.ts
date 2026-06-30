import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../../internal-types'

export type ViteNuxtPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<
  'vite',
  UserStrategy,
  T
> & NuxtPWAContext<
  'vite',
  UserStrategy,
  T
>

export type ViteLegacyNuxtPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<
  'vite-legacy',
  UserStrategy,
  T
> & NuxtPWAContext<
  'vite-legacy',
  UserStrategy,
  T
>
