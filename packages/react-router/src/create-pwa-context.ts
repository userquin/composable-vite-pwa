import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ReactRouterPWAOptions } from './types'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'

export type ReactRouterPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<'vite', UserStrategy, T>

export interface ReactRouterPWAApi<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> {
  ctx: ReactRouterPWAContext<UserStrategy, T>
}

export function createReactRouterPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<ReactRouterPWAOptions<UserStrategy, T>>,
): ReactRouterPWAContext<UserStrategy, T> {
  return Object.assign(
    createVitePWAContext(true, options),
    {
      hmrRequiresSwitcher: true,
    },
  )
}
