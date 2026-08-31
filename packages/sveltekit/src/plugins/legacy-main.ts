import type {
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { ViteBundler, VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'

export function LegacySvelteKitMainPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
): Plugin {
  return {
    name: 'vite-pwa:sveltekit:legacy-main',
    enforce: 'pre',
    sharedDuringBuild: true,
    configResolved(config) {
      ctx.envApi = false
      // @ts-expect-error TS2322: Argument of type multiple vite versions
      ctx.viteConfig = config
    },
  }
}
