import type { PluginOption } from 'vite'
import type { Strategy } from '../../../config/types'
import type { SWType } from '../../../types'
import type { VitePWAOptions } from './types'
import { devPluginName } from './plugin-context'

export type { VitePWAOptions }

export function VitePWA<
  S extends Strategy,
  T extends SWType = 'classic',
>(
  options: VitePWAOptions<S, T> = {},
): PluginOption {
  return async () => {
    const {
      checkStrategy,
      preparePluginContext,
      handleBuild,
    } = await import('./plugin-context')
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
      api: {
        generateSW: async (options: import('../../types').BuildGenerateSWOptions<T>) => {
          if (!pluginContext.isDev) {
            return
          }
          const { strategy } = await pluginContext.resolvedOptions
          if (!strategy || strategy !== 'generate-sw') {
            return
          }
          const { vite } = await pluginContext.detectionResult
          if (vite) {
            await import('../generate-sw').then(({
              generateSW,
            }) => generateSW(
              options,
            ))
          }
          else {
            await import('../legacy-generate-sw').then(({
              generateSWLegacy,
            }) => generateSWLegacy(
              options,
            ))
          }
        },
        injectManifest: async (options: import('../../../config/types').InjectManifestStrategyOptions) => {
          if (!pluginContext.isDev) {
            return
          }
          const { strategy } = await pluginContext.resolvedOptions
          if (!strategy || strategy !== 'inject-manifest') {
            return
          }
          await import('../../../inject-manifest').then(({
            injectManifest,
          }) => injectManifest(
            options,
          ))
        },
      },
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
          ] = await Promise.all([
            pluginContext.resolvedOptions,
            pluginContext.detectionResult,
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
