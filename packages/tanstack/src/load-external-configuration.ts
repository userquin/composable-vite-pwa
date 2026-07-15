import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { TanStackPWAContext } from './create-pwa-context'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'

export async function loadExternalConfiguration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: TanStackPWAContext<UserStrategy, T>,
): Promise<void> {
  const resolvedOptions = await resolvePwaConfiguration(
    ctx.consumerOptions ?? {},
  )
  Object.assign(ctx, { resolvedOptions })
}
