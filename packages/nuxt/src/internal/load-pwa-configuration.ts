import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types.ts'
import fs from 'node:fs'
import path from 'node:path'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'

export async function loadPwaConfiguration<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
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
