import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import type { VitePWAPluginContext } from './vite-context'
import { createPWAContext } from '../context'
import { BuildPlugin } from './plugins/build'
import { DevPlugin } from './plugins/dev'
import { DevMiddlewarePlugin } from './plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from './plugins/dev-pwa-assets-middleware'
import { InfoPlugin } from './plugins/info'
import { MainPlugin } from './plugins/main'
import { AssetsPlugin } from './plugins/pwa-assets'

export function VitePWA<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  options: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PluginOption {
  const ctx = Object.assign(
    createPWAContext('vite-legacy', options) as VitePWAPluginContext<'vite-legacy', UserStrategy, S, T>,
    {
      viteConfig: undefined!,
      envApi: false,
    },
  )

  ctx.dev.customHMRPwaAsset = async (asset, source) => {
    return await import('./dev/hmr-support').then(({
      customHMR,
    }) => customHMR(
      ctx,
      asset,
      source,
    ))
  }

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
