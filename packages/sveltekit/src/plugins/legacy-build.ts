import type {
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { ViteBundler, VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'

export function LegacySvelteKitBuildPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
): Plugin {
  return {
    name: 'vite-pwa:sveltekit:build-legacy',
    enforce: 'post',
    apply: 'build',
    sharedDuringBuild: true,
    closeBundle: {
      sequential: true,
      order: 'pre',
      async handler() {
        if (!ctx.resolvedOptions.disable && ctx.viteConfig.build.ssr) {
          await ctx.runBuild()
        }
      },
    },
  } as Plugin
}
