import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { TanStackPWAContext } from '../create-pwa-context'

/**
 * Vite plugin to generate the service workers.
 *
 * @param ctx The Vite PWA plugin context.
 */
export function BuildSWPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: TanStackPWAContext<UserStrategy, T>): Plugin {
  return {
    name: 'vite-pwa:tanstack:build:sw',
    enforce: 'post',
    apply: 'build',
    sharedDuringBuild: true,
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    buildApp: {
      order: 'post',
      async handler() {
        if (ctx.tanstack.nitro) {
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
  }
}
