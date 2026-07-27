import type {
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { ViteBundler, VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Adapter } from '@sveltejs/kit'

export function SvelteKitAdapterWrapper<
  UserStrategy extends VitePWAStrategy,
  B extends ViteBundler,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<B, UserStrategy, T>,
  adapter?: Adapter,
): Adapter {
  const { adapt, ...options } = adapter ?? {}
  return Object.assign(
    options,
    {
      async adapt(builder) {
        await ctx.runBuild()
        return await adapt?.(builder)
      },
    } as Partial<Adapter>,
  ) as Adapter
}
