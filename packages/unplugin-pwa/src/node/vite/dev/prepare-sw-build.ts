import type { BuildGenerateSWOptions, BuildWithSourcesResult } from '@composable-vite-pwa/workbox-build/build/types'
import type { SelfDestroyingStrategyOptions, Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { BuildResult, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { BuildSWType } from '../../context-types'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import path, { basename, resolve } from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export async function prepareSwBuild<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
) {
  if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled === true) {
    switch (ctx.strategy) {
      case 'self-destroy-sw':
        await ctx.dev.selfDestroyingSW(prepareSelfDestroyingSW(ctx))
        break
      case 'build-sw':
        await buildBuildSW(ctx)
        break
      case 'generate-sw':
        await buildGenerateSW(ctx)
        break
      case 'inject-manifest':
        await ctx.dev.selfDestroyingSW(prepareSelfDestroyingSW(ctx))
        break
    }

    ctx.dev.options!.swGenerated = true
  }
}

function prepareSelfDestroyingSW<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): SelfDestroyingStrategyOptions {
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
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
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
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): Promise<Partial<BuildGenerateSWOptions<T>>> {
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
    globStrict: true,
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

async function prepareBuildSW<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): Promise<Partial<BuildSWType<ViteBundler, T>>> {
  const options = ctx.resolvedOptions.buildSW as BuildSWType<ViteBundler, T>

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
    globStrict: true,
    globDirectory,
    additionalManifestEntries: [{
      url: ctx.resolvedOptions.devOptions?.navigateFallback || 'index.html',
      revision: Math.random().toString(32),
    }],
    globPatterns,
    swDest: devSWDest,
  }
}

function collectSWBuildResult(
  result: BuildResult | BuildWithSourcesResult,
  ctx: VitePWAPluginContext<any, any, any, any>,
) {
  const base = ctx.base
  const assets = ctx.dev.options!.swAssetsPaths
  const root = process.cwd()
  for (const chunk of result.filePaths) {
    const name = `${base}${basename(chunk)}`
    if (!assets.has(name)) {
      assets.set(name, path.resolve(root, chunk))
    }
  }
  console.log(result)
  if ('sources' in result) {
    ctx.sources.clear()
    for (const source of result.sources) {
      ctx.sources.add(source)
    }
  }
}

async function buildGenerateSW<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>) {
  collectSWBuildResult(await ctx.dev.generateSW(await prepareGenerateSW(ctx)), ctx)
}

async function buildBuildSW<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>) {
  collectSWBuildResult(await ctx.dev.buildSW(await prepareBuildSW(ctx)), ctx)
}
