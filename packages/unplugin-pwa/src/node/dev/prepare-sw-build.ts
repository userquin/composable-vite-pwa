import type { BuildGenerateSWOptions, BuildWithSourcesResult } from '@composable-vite-pwa/workbox-build/build/types'
import type { SelfDestroyingStrategyOptions } from '@composable-vite-pwa/workbox-build/config/types'
import type { BuildResult, InjectManifestOptions, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { BuildSWType, Bundler, PWAPluginContext } from '../context-types'
import type { VitePWAStrategy } from '../types'
import { promises as fs } from 'node:fs'
import path, { basename, resolve } from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export async function prepareSwBuild<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, T>,
) {
  if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled === true) {
    switch (ctx.strategy) {
      case 'inject-manifest':
        await buildInjectManifest(ctx)
        break
      case 'build-sw':
        await buildBuildSW(ctx)
        break
      case 'generate-sw':
        await buildGenerateSW(ctx)
        break
      case 'self-destroy-sw':
        await ctx.dev.selfDestroyingSW(prepareSelfDestroyingSW(ctx))
        break
    }

    ctx.dev.options!.swGenerated = true
  }
}

function prepareSelfDestroyingSW<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>): SelfDestroyingStrategyOptions {
  const options = ctx.resolvedOptions.selfDestroying as SelfDestroyingStrategyOptions
  const selfDestroying = Array.isArray(options.swDest) ? options.swDest : [options.swDest]
  const internalDevOptions = ctx.dev.options!
  const folder = internalDevOptions.tempFolder
  const assets = internalDevOptions.swAssetsPaths
  const root = process.cwd()
  const swDest: string[] = []
  const base = ctx.base
  for (const sw of selfDestroying) {
    const swPath = path.relative(root, path.resolve(folder, sw))
    swDest.push(swPath)
    assets.set(`${base}${sw}`, swPath)
  }

  return {
    swDest,
  }
}

async function prepareAssets<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, T>,
  globPatternsFromOptions?: string[],
) {
  const internalDevOptions = ctx.dev.options!
  const folder = internalDevOptions.tempFolder
  const assets = internalDevOptions.swAssetsPaths
  const base = ctx.base
  const {
    devSWDest,
    name: swDestPath,
    path: swPath,
    classic: classicSWDestPath,
    classicPath,
    module: moduleSWDestPath,
    modulePath,
  } = internalDevOptions.swNames

  switch (ctx.resolvedOptions.swType) {
    case 'classic-and-module':
      assets.set(`${base}${classicSWDestPath}`, classicPath)
      assets.set(`${base}${moduleSWDestPath}`, modulePath)
      break
    default:
      assets.set(`${base}${swDestPath}`, swPath)
      break
  }

  const suppressWarnings = ctx.resolvedOptions.devOptions
    ? !('suppressWarnings' in ctx.resolvedOptions.devOptions) || ctx.resolvedOptions.devOptions.suppressWarnings === true
    : true
  if (suppressWarnings) {
    const suppressWarningsPath = normalizePath(resolve(folder, 'suppress-warnings.js'))
    await fs.writeFile(suppressWarningsPath, '', 'utf-8')
    assets.set(`${base}suppress-warnings.js`, suppressWarningsPath)
  }

  const globPatterns = suppressWarnings
    ? ['suppress-warnings.js']
    : globPatternsFromOptions

  return {
    devSWDest,
    globDirectory: internalDevOptions.globDirectory,
    globPatterns,
  }
}

async function prepareGenerateSW<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>): Promise<Partial<BuildGenerateSWOptions<T>>> {
  const options = ctx.resolvedOptions.generateSW as BuildGenerateSWOptions<T>
  const internalDevOptions = ctx.dev.options!

  const {
    devSWDest,
    globPatterns,
    globDirectory,
  } = await prepareAssets(
    ctx,
    options.globPatterns,
  )

  return {
    // prevent build error
    globStrict: false,
    navigateFallbackAllowlist: internalDevOptions.navigateFallbackAllowlist ?? [/^\/$/],
    runtimeCaching: ctx.resolvedOptions.devOptions?.disableRuntimeConfig ? undefined : options.runtimeCaching,
    // we only include navigateFallback: add revision to remove workbox-build warning
    additionalManifestEntries: options.navigateFallback
      ? [{
          url: options.navigateFallback,
          revision: Math.random().toString(32),
        }]
      : undefined,
    cleanupOutdatedCaches: true,
    globDirectory,
    globPatterns,
    swDest: devSWDest,
  }
}

async function prepareInjectManifest<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>): Promise<Partial<InjectManifestOptions>> {
  const options = ctx.resolvedOptions.injectManifest as InjectManifestOptions

  const {
    devSWDest,
    globPatterns,
    globDirectory,
  } = await prepareAssets(
    ctx,
    options.globPatterns,
  )

  return {
    // prevent build error
    globStrict: false,
    globDirectory,
    additionalManifestEntries: [{
      url: ctx.resolvedOptions.devOptions?.navigateFallback || 'index.html',
      revision: Math.random().toString(32),
    }],
    globPatterns,
    swDest: devSWDest,
  }
}

async function prepareBuildSW<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>): Promise<Partial<BuildSWType<B, T>>> {
  const options = ctx.resolvedOptions.buildSW as BuildSWType<B, T>

  const {
    devSWDest,
    globPatterns,
    globDirectory,
  } = await prepareAssets(
    ctx,
    options.globPatterns,
  )

  return {
    // prevent build error
    globStrict: false,
    globDirectory,
    additionalManifestEntries: [{
      url: ctx.resolvedOptions.devOptions?.navigateFallback || 'index.html',
      revision: Math.random().toString(32),
    }],
    globPatterns,
    swDest: devSWDest,
  } as Partial<BuildSWType<B, T>>
}

async function collectSWBuildResult<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  result: BuildResult | BuildWithSourcesResult,
  ctx: PWAPluginContext<B, UserStrategy, T>,
) {
  const base = ctx.base
  const assets = ctx.dev.options!.swAssetsPaths
  const keys = ctx.dev.options!.swAssetKeys
  keys.clear()
  const root = process.cwd()
  for (const chunk of result.filePaths) {
    const name = `${base}${basename(chunk)}`
    keys.add(name)
    if (!assets.has(name)) {
      assets.set(name, path.resolve(root, chunk))
    }
  }
  if ('sources' in result) {
    ctx.sources.clear()
    for (const source of result.sources) {
      ctx.sources.add(source)
    }
  }

  await ctx.hooks.callHook('service-worker:generated')
}

async function buildInjectManifest<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>) {
  await collectSWBuildResult(await ctx.dev.injectManifest(await prepareInjectManifest(ctx)), ctx)
}

async function buildGenerateSW<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>) {
  await collectSWBuildResult(await ctx.dev.generateSW(await prepareGenerateSW(ctx)), ctx)
}

async function buildBuildSW<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, T>) {
  await collectSWBuildResult(await ctx.dev.buildSW(await prepareBuildSW(ctx)), ctx)
}
