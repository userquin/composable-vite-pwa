import type { PluginOption } from 'vite'
import type { Strategy } from '../../../config/types'
import type { SWType } from '../../../types'
import type { VitePWAOptions } from './types'
import { createApi } from '@composable-vite-pwa/workbox-build/build/vite/plugin/plugin-api'
import { checkStrategy, devPluginName, preparePluginContext } from './plugin-context'

export type { VitePWAOptions }

export function VitePWA<
  S extends Strategy,
  T extends SWType = 'classic',
>(
  options: VitePWAOptions<S, T> = {},
): PluginOption {
  return async () => {
    const pluginContext = preparePluginContext(options)
    return [{
      name: devPluginName,
      apply: 'serve',
      applyToEnvironment(environment) {
        return environment.config.consumer === 'client'
      },
      async configResolved(config) {
        await checkStrategy(true, pluginContext, config)
      },
      api: createApi(pluginContext),
    }, {
      name: 'vite-pwa:builder:plugin',
      apply: 'build',
      enforce: 'post',
      applyToEnvironment(environment) {
        return environment.config.consumer === 'client'
      },
      async configResolved(config) {
        await checkStrategy(false, pluginContext, config)
      },
      closeBundle: {
        sequential: true,
        order: 'post',
        async handler() {
          const [
            resolvedPluginOptions,
            { vite },
            handleBuild,
          ] = await Promise.all([
            pluginContext.resolvedOptions,
            pluginContext.detectionResult,
            import('./plugin-builder').then(({ handleBuild }) => handleBuild),
          ])
          if (!vite && pluginContext.resolvedViteConfig.build.ssr) {
            return
          }
          await handleBuild(
            pluginContext,
            resolvedPluginOptions,
            vite,
          )
        },
      },
    }] satisfies PluginOption
  }
}
