import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'

/**
 * Vite plugin to generate the service workers.
 *
 * @param ctx The Vite PWA plugin context.
 */
export function BuildSWPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  return {
    name: 'unplugin-pwa:build:sw',
    enforce: 'post',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler(error) {
        if (error) {
          return
        }

        if (!ctx.envApi && ctx.viteConfig.build.ssr) {
          return
        }

        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          await pwaAssetsGenerator.generate()
        }

        if (!ctx.resolvedOptions.disable) {
          await ctx.runBuild()
        }
      },
    },
    async buildEnd(error) {
      if (error)
        throw error
    },
  }
}
