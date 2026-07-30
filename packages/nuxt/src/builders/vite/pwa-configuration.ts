import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from './internal-types'
import fs from 'node:fs'
import path from 'node:path'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'

export async function loadPwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, T> | ViteLegacyNuxtPWAContext<UserStrategy, T>,
  nuxt: Nuxt,
): Promise<void> {
  const resolvedOptions = await resolvePwaConfiguration(
    ctx.consumerOptions,
    {
      isDev: nuxt.options.dev,
      isWrongInjectManifest: (swSrc) => {
        return ctx.nuxt.publicDirs.some(dir => fs.existsSync(path.resolve(swSrc, dir)))
      },
    },
  )
  ctx.resolvedOptions = resolvedOptions as unknown as any
}
