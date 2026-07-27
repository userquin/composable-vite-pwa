import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { SvelteKitPWAOptions } from './types'
import { BuildRegisterSWPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { DevtoolsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/devtools'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { InspectorPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/inspector'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { sveltekit } from '@sveltejs/kit/vite'
import { SvelteKitAdapterWrapper } from './adapter'
import { createSvelteKitPWAContext } from './context'
import { SvelteKitBuildPlugin } from './plugins/build'

export function withPwa<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  config: Parameters<typeof sveltekit>[0] = {},
  options: Partial<SvelteKitPWAOptions<UserStrategy, T>> = {},
) {
  const ctx = createSvelteKitPWAContext<UserStrategy, T>(
    config,
    options,
  )

  return [
    sveltekit(Object.assign(
      config,
      {
        adapter: SvelteKitAdapterWrapper(ctx, config.adapter),
      },
    )),
    [
      MainPlugin(ctx),
      InfoPlugin(ctx),
      DevPlugin(ctx),
      DevMiddlewarePlugin(ctx),
      DevAssetsMiddlewarePlugin(ctx),
      AssetsPlugin(ctx),
      BuildRegisterSWPlugin(ctx),
      SvelteKitBuildPlugin(ctx),
      DevtoolsPlugin(ctx),
      InspectorPlugin(ctx),
    ],
  ]
}
