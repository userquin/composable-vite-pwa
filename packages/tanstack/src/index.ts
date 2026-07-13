import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { TanStackPWAOptions } from './types'
import { BuildPwaAssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-pwa-assets'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { createTanStackPWAContext } from './create-pwa-context'
import { BuildSWPlugin } from './plugins/build-sw'
import { NitroPlugin } from './plugins/nitro'

export function TanStackPWAPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<TanStackPWAOptions<UserStrategy, T>> = {},
): PluginOption[] {
  const ctx = createTanStackPWAContext(
    options,
  )

  return [
    NitroPlugin(ctx),
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildPwaAssetsPlugin(ctx),
    BuildSWPlugin(ctx),
  ]
}
