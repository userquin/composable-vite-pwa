import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../../internal-types'

export type ViteNuxtPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
> = NuxtPWAContext<
  'vite',
  UserStrategy,
  S,
  T,
  VitePWAPluginContext<
    'vite',
    UserStrategy,
    S,
    T
  >
>

export type ViteLegacyNuxtPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
> = NuxtPWAContext<
  'vite-legacy',
  UserStrategy,
  S,
  T,
  VitePWAPluginContext<
    'vite-legacy',
    UserStrategy,
    S,
    T
  >
>
