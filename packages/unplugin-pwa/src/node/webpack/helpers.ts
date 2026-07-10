import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Compiler } from 'webpack'
import type { PWAPluginContext } from '../context-types'
import type { VitePWAStrategy } from '../types'
import path from 'node:path'
import process from 'node:process'
import { prepareManifest, resolvePwaConfiguration } from '../config'
import { prepareSwNames } from '../prepare-sw-names'
import { normalizeManifest, preparePWAAssetsGenerator, preparePWAStrategy, resolveBasePath } from '../vite/helpers'
import { pwaAssetsResolver } from '../vite/pwa-assets-resolver'

export async function prepareWebpackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  compiler: Compiler,
  ctx: PWAPluginContext<'webpack', UserStrategy, T>,
): Promise<void> {
  if (ctx.externalConfigurationLoader)
    return

  ctx.resolvedOptions = await resolvePwaConfiguration<UserStrategy, T>(ctx.consumerOptions)

  const root = compiler.options.context || process.cwd()
  const outDir = compiler.options.output.path || path.resolve(root, 'dist')
  const configuredBase = ctx.resolvedOptions.base
    ?? (typeof compiler.options.output.publicPath === 'string' ? compiler.options.output.publicPath : '/')
  const base = resolveBasePath(configuredBase || '/')
  const buildBase = ctx.resolvedOptions.buildBase ?? base

  ctx.rootDir = root
  ctx.outDir = outDir
  ctx.publicDir = path.resolve(root, 'public')
  ctx.base = base
  ctx.strategy = ctx.resolvedOptions.strategy!
  ctx.useImportRegister = false
  ctx.resolvedOptions.base = base
  ctx.resolvedOptions.buildBase = buildBase
  ctx.resolvedOptions.scope ||= base

  // normalizeManifest also loads package.json defaults.
  normalizeManifest(ctx as any)
  preparePWAStrategy(ctx as any, root, outDir, 'assets')
  const strategyOptions = ctx.strategy === 'generate-sw'
    ? ctx.resolvedOptions.generateSW
    : ctx.strategy === 'build-sw'
      ? ctx.resolvedOptions.buildSW
      : ctx.strategy === 'inject-manifest'
        ? ctx.resolvedOptions.injectManifest
        : undefined
  if (strategyOptions) {
    strategyOptions.globDirectory = outDir
    strategyOptions.swDest = path.resolve(outDir, strategyOptions.swDest!)
    if ('swSrc' in strategyOptions && strategyOptions.swSrc)
      strategyOptions.swSrc = path.resolve(root, strategyOptions.swSrc)
    if (ctx.strategy === 'inject-manifest') {
      delete (strategyOptions as Record<string, unknown>).swType
      delete (strategyOptions as Record<string, unknown>).minify
    }
  }
  if (ctx.strategy === 'self-destroy-sw' && ctx.resolvedOptions.selfDestroying) {
    const destinations = ctx.resolvedOptions.selfDestroying.swDest
    ctx.resolvedOptions.selfDestroying.swDest = (Array.isArray(destinations) ? destinations : [destinations])
      .map(destination => path.resolve(outDir, destination))
  }
  preparePWAAssetsGenerator(ctx as any)
  if (!ctx.devEnvironment && !ctx.resolvedOptions.disable)
    prepareSwNames(ctx)

  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx as any)
  ctx.externalConfigurationLoader = true
}

/** @deprecated Use normalizeManifest; retained for downstream adapter compatibility. */
export { prepareManifest }
