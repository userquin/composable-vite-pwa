import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { DefaultTheme, UserConfig } from 'vitepress'
import { BuildPwaAssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-pwa-assets'
import { BuildRegisterSWPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { DevtoolsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/devtools'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { InspectorPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/inspector'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { createVitePressPWAContext } from './create-context'

export function withUserConfig<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  VPTheme = DefaultTheme.Config,
>(
  config: UserConfig<VPTheme>,
): UserConfig<VPTheme> {
  const ctx = createVitePressPWAContext<UserStrategy, T, VPTheme>(config)
  const viteConf = config.vite ??= {}
  const vitePlugins = viteConf.plugins ??= []

  const plugins: import('vite').PluginOption = [
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildRegisterSWPlugin(ctx),
    BuildPwaAssetsPlugin(ctx),
    DevtoolsPlugin(ctx),
    InspectorPlugin(ctx),
  ]

  // @xts-expect-error TS2345: Argument of type PluginOption[] is not assignable to parameter of type PluginOption
  vitePlugins.push(plugins)

  return config
}
