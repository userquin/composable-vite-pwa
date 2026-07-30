import type {
  BasePartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { ExtractStrategy } from '../context-types'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import path from 'node:path'
import process from 'node:process'
import {
  normalizeManifest,
  normalizePath,
  prepareAdditionalManifestEntriesGenerator,
  preparePWAAssetsGenerator,
  resolveBasePath,
  resolveFrom,
  resolveSWSrc,
} from '../helpers'
import { prepareSwNames } from '../prepare-sw-names'

/**
 * Configures the PWA strategy at the resolved PWA options.
 * @param ctx The PWA context.
 * @param cwd The current working directory.
 * @param outDir The output directory.
 * @param immutableAssets The immutable assets directory.
 */
export async function preparePWAStrategy<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
  cwd: string,
  outDir: string,
  immutableAssets: string,
) {
  const outputPath = path.resolve(cwd, outDir)
  let options: Partial<BasePartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.generateSW
      break
    case 'inject-manifest':
      ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.injectManifest
      break
    case 'build-sw':
      ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.buildSW
      // todo: finish alias, ask sapphi-red
      // add vite/rolldown aliases
      /* if (ctx.bundler === 'vite') {
        const viteOptions = options as import('@composable-vite-pwa/workbox-build/build/vite/types').ServiceWorkerOptions
        const viteAlias = viteOptions.alias ?? {}
        Object.assign(
          options!,
          { alias: ctx.viteConfig.resolve?.alias ?? {} },
          { alias: viteAlias },
        )
      }
      else {
        const rolldownOptions = options as import('@composable-vite-pwa/workbox-build/build/rolldown/types').ServiceWorkerOptions
        const viteAlias = rolldownOptions.alias ?? {}
        Object.assign(
          options!,
          { alias: ctx.viteConfig.resolve?.alias ?? {} },
          { alias: viteAlias },
        )
      } */
      break
  }

  if (options) {
    Object.assign(options, {
      additionalManifestEntriesGenerator: prepareAdditionalManifestEntriesGenerator(ctx),
    })
    Object.assign(options, {
      globDirectory: options.globDirectory
        ? normalizePath(path.relative(cwd, resolveFrom(cwd, options.globDirectory)))
        : normalizePath(path.relative(cwd, resolveFrom(cwd, outputPath))),
    })
    if (!('dontCacheBustURLsMatching' in options)) {
      let assetsOutputDir = path.relative(outputPath, path.resolve(outputPath, immutableAssets))
      if (assetsOutputDir.at(-1) !== '/')
        assetsOutputDir += '/'

      // remove './' prefix from assetsDir
      Object.assign(options, {
        dontCacheBustURLsMatching: new RegExp(`^${assetsOutputDir.replace(/^\.*\//, '')}`),
      })
    }
    if (ctx.strategy !== 'generate-sw') {
      if ('swSrc' in options) {
        Object.assign(options, {
          swSrc: resolveSWSrc(cwd, options.swSrc as string),
        })
      }
    }

    if (ctx.strategy === 'generate-sw') {
      if (ctx.resolvedOptions.registerType === 'autoUpdate') {
        ctx.resolvedOptions.generateSW!.clientsClaim = true
        ctx.resolvedOptions.generateSW!.skipWaiting = true
      }
    }

    if ('swDest' in options && options.swDest) {
      const resolvedSwDest = path.dirname(path.resolve(cwd, options.swDest))
      if (resolvedSwDest !== outputPath) {
        Object.assign(options, {
          swDest: resolveFrom(outputPath, options.swDest),
        })
      }
    }
    else {
      Object.assign(options, {
        swDest: resolveFrom(outputPath, 'sw.js'),
      })
    }
  }
  else if (!ctx.devEnvironment && ctx.strategy === 'self-destroy-sw') {
    const data = ctx.resolvedOptions.selfDestroying
    if (data) {
      const entries = typeof data.swDest === 'string' ? [data.swDest] : data.swDest
      const newDestSW: string[] = []
      for (const swDest of entries) {
        const resolvedSwDest = path.dirname(path.resolve(cwd, swDest))
        if (resolvedSwDest !== outputPath) {
          newDestSW.push(resolveFrom(outputPath, swDest))
        }
        else {
          newDestSW.push(swDest)
        }
      }
      data.swDest = newDestSW
    }
  }
}

/**
 * Prepares the PWA defaults from main plugin.
 *
 * **NOTE**: if the PWA plugin context has `pwaConfigurationLoaded` set to `true`, this function will return immediately.
 *
 * @param forClient The Vite resolved configuration is for client?.
 * @param config The Vite resolved configuration.
 * @param ctx The PWA Vite plugin context.
 */
export async function preparePWAContextDefaults<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  forClient: boolean,
  config: ResolvedConfig,
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
): Promise<void> {
  if (ctx.externalConfigurationLoader) {
    return
  }
  await Promise.all([
    import('../config').then(({
      resolvePwaConfiguration,
    }) => resolvePwaConfiguration<UserStrategy, T>(
      ctx.consumerOptions,
      {
        isDev: ctx.devEnvironment,
        isWrongInjectManifest: (swSrc) => {
          const swSrcDir = normalizePath(path.dirname(swSrc))
          const publicDir = normalizePath(path.resolve(process.cwd(), ctx.viteConfig.publicDir || 'public'))

          return !(swSrcDir === publicDir)
        },
      },
    )).then(resolvedOptions => (ctx.resolvedOptions = resolvedOptions)),
    import('@composable-vite-pwa/workbox-build/build/vite').then(({
      detect,
    }) => detect({
      vite: true,
    }).then(({ vite }) => (
      ctx.bundler = vite ? 'vite' : 'vite-legacy'
    ))),
  ])
  const {
    base = config.base,
    scope,
    buildBase,
  } = ctx.resolvedOptions
  const basePath = resolveBasePath(base)
  ctx.normalizeDevServiceWorkerId ??= (hook, depType, id) => {
    if (depType === 'sw') {
      return [id.startsWith('/') ? id.slice(1) : id, id]
    }

    if (hook === 'load') {
      return [id, id]
    }

    const assetId = id.startsWith('./') ? id.slice(1) : id
    return [assetId, assetId]
  }
  ctx.resolvedOptions.scope = scope || basePath
  ctx.resolvedOptions.base = buildBase ?? basePath
  ctx.resolvedOptions.buildBase = ctx.resolvedOptions.base
  ctx.strategy = ctx.resolvedOptions.strategy!
  ctx.useImportRegister = false
  ctx.publicDir = config.publicDir
  ctx.outDir = config.build.outDir
  ctx.base = config.base
  let outDir = 'dist'
  let immutableAssets = config.build.assetsDir ?? 'assets'
  let cwd = config.root
  if (ctx.configurePWAOptions) {
    const pwaOptions = await ctx.configurePWAOptions(forClient, config)
    if (pwaOptions) {
      outDir = pwaOptions.outDir
      immutableAssets = pwaOptions.immutableAssets
      cwd = pwaOptions.cwd
    }
  }
  normalizeManifest(ctx)
  await preparePWAStrategy(ctx, cwd, outDir, immutableAssets)
  preparePWAAssetsGenerator(ctx)
  // todo: review this for self-destroy-sw
  if (!ctx.devEnvironment && !ctx.resolvedOptions.disable) {
    prepareSwNames(ctx)
  }
}
