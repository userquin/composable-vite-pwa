import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { SvelteKitPWAOptions } from './types'
import {
  BuildRegisterSWPlugin,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import {
  DevMiddlewarePlugin,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import {
  DevAssetsMiddlewarePlugin,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { DevtoolsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/devtools'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { InspectorPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/inspector'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { VERSION } from '@sveltejs/kit'
import { getMajor } from 'verkit'
import { createSvelteKitPWAContext } from './context'
import { SvelteKitBuildPlugin } from './plugins/build'
import { LegacySvelteKitBuildPlugin } from './plugins/legacy-build'
import { LegacySvelteKitMainPlugin } from './plugins/legacy-main'

export function LegacySvelteKitPWA<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<SvelteKitPWAOptions<UserStrategy, T>> = {},
): PluginOption {
  if (getMajor(VERSION) >= 3) {
    throw new Error('LegacySvelteKitPWA is not compatible with SvelteKit version 3 or higher, use withPwa from default subpackage export.')
  }

  const ctx = createSvelteKitPWAContext<UserStrategy, T>(
    {},
    options,
  )

  return [
    LegacySvelteKitMainPlugin(ctx),
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildRegisterSWPlugin(ctx),
    SvelteKitBuildPlugin(ctx),
    LegacySvelteKitBuildPlugin(ctx),
    DevtoolsPlugin(ctx),
    InspectorPlugin(ctx),
  ]
}
