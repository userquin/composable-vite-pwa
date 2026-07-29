import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import { existsSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { prepareNitroRoutes } from './prepare-nitro-routes'
import { prepareResolvedPwaOptions } from './prepare-resolved-pwa-options'
import { registerPwaIconsTypes } from './register-pwa-icons-types'

export function nitroInitHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
  runtimeDir: string,
): import('@nuxt/schema').NuxtHooks['nitro:init'] {
  return async (nitro) => {
    const publicDirs = new Set<string>()
    const resolver = ctx.nuxt.moduleResolver
    for (const layer of nuxt.options._layers) {
      publicDirs.add(normalizePath(resolver.resolve(layer.config.rootDir, layer.config.dir?.public || 'public')))
    }

    ctx.nuxt.publicDirs = [...publicDirs].filter(dir => existsSync(dir))

    await ctx.nuxt.loadPwaConfiguration()

    const externalPWAPath = ctx.resolvedOptions.path
    if (externalPWAPath) {
      nuxt.options.watch.push(externalPWAPath)
    }

    if (nuxt.options.dev) {
      ctx.devEnvironment = true
      const internalDevOptions = ctx.dev.options!
      internalDevOptions.tempFolder = path.resolve(nuxt.options.buildDir, 'pwa/.dev-dist')
      ctx.outDir = internalDevOptions.tempFolder
      ctx.rootDir = nuxt.options.rootDir
      ctx.publicDir = nuxt.options.dir.public
    }
    else {
      const publicDir = nitro.options.output.publicDir
      ctx.outDir = publicDir ? path.resolve(process.cwd(), publicDir) : path.resolve(process.cwd(), './.output/public')
      ctx.publicDir = ctx.outDir
      ctx.rootDir = ctx.outDir
      ctx.resolvedOptions.outDir = ctx.outDir
    }

    ctx.strategy = ctx.resolvedOptions.strategy!
    ctx.resolvedOptions.base ??= ctx.base
    ctx.resolvedOptions.buildBase ??= ctx.base
    ctx.resolvedOptions.scope ??= ctx.base

    try {
      // apply nuxt pwa default options
      await prepareResolvedPwaOptions<B, UserStrategy, T, NPWAC>(ctx, nuxt, ctx.outDir)

      // add custom bundler options
      await ctx.nuxt.initPwaConfiguration()

      // add nitro routes
      await prepareNitroRoutes<B, UserStrategy, T, NPWAC>(ctx, nuxt)

      // add pwa icons types
      await registerPwaIconsTypes<B, UserStrategy, T, NPWAC>(ctx, nuxt)
    }
    catch (e) {
      await ctx.hooks.callHook('context:ready', e)
      throw e
    }

    await ctx.hooks.callHook('context:ready')
  }
}
