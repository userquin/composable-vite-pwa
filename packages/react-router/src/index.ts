import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { ReactRouterPWAOptions } from './types'
import { BuildPwaAssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-pwa-assets'
import { BuildRegisterSWPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { createReactRouterPWAContext } from './create-pwa-context'
import { ApiPlugin } from './plugins/node/api'

export function ReactRouterPWAPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  reactRouterPlugin: ReturnType<typeof import('@react-router/dev/vite')['reactRouter']>,
  options: Partial<ReactRouterPWAOptions<UserStrategy, T>> = {},
): PluginOption[] {
  const ctx = createReactRouterPWAContext(
    reactRouterPlugin,
    options,
  )

  return [
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildRegisterSWPlugin(ctx),
    BuildPwaAssetsPlugin(ctx),
    ApiPlugin(ctx),
  ]
}
