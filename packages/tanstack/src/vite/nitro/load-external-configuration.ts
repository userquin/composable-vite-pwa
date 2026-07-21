import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { TanStackNitroPWAContext } from '../../create-nitro-pwa-context'
import path from 'node:path'
import process from 'node:process'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export async function loadExternalConfiguration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: TanStackNitroPWAContext<UserStrategy, T>,
): Promise<void> {
  const resolvedOptions = await resolvePwaConfiguration(
    ctx.consumerOptions ?? {},
    {
      isDev: false,
      isWrongInjectManifest: (swSrc) => {
        // nitro will check for public folder
        const swSrcDir = normalizePath(path.dirname(swSrc))
        const publicDir = normalizePath(path.resolve(process.cwd(), 'public'))

        return !(swSrcDir === publicDir)
      },
    },
  )
  Object.assign(ctx, { resolvedOptions })
}
