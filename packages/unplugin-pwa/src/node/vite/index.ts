import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import { BuildPlugin } from './plugins/build'
import { DevPlugin } from './plugins/dev'
import { DevMiddlewarePlugin } from './plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from './plugins/dev-pwa-assets-middleware'
import { InfoPlugin } from './plugins/info'
import { MainPlugin } from './plugins/main'
import { AssetsPlugin } from './plugins/pwa-assets'
import { pwaAssetsResolver } from './pwa-assets-resolver'
import { createVitePWAContext } from './vite-context'

export function VitePWA<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PluginOption {
  const ctx = createVitePWAContext(
    true,
    options,
  )

  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return [
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildPlugin(ctx),
  ]
}
