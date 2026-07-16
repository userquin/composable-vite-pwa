import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from './internal-types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { resolvePwaConfiguration } from '@composable-vite-pwa/unplugin-pwa/node/config'
import {
  normalizeManifest,
  preparePWAAssetsGenerator,
  preparePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/helpers'

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

export async function initPwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, T> | ViteLegacyNuxtPWAContext<UserStrategy, T>,
  nuxt: Nuxt,
) {
  normalizeManifest(ctx)
  preparePWAAssetsGenerator(ctx)
  switch (ctx.strategy) {
    case 'build-sw':
      ctx.resolvedOptions.buildSW!.alias = nuxt.options.alias
      break
  }
  if (nuxt.options.dev) {
    await preparePWAStrategy(
      ctx,
      process.cwd(),
      ctx.dev.options.tempFolder,
      nuxt.options.app.buildAssetsDir ?? '_nuxt/',
    )
  }
  else {
    await preparePWAStrategy(
      ctx,
      process.cwd(),
      ctx.outDir,
      nuxt.options.app.buildAssetsDir ?? '_nuxt/',
    )
  }
}
