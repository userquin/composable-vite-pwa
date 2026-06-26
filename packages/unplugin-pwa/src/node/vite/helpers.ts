import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type {
  BasePartial,
  ManifestEntry,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  ResolvedVitePWAOptions,
  VitePWAStrategy,
} from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import path from 'node:path'
import { prepareSwNames } from '@composable-vite-pwa/unplugin-pwa/node/prepare-sw-names'
import pc from 'picocolors'
import { additionalManifestEntriesFactory } from '../additional-manifest-entries'
import { prepareManifest } from '../config'

const normalizePathRegexp = /\\/g

export function normalizePath(path: string): string {
  return path.replace(normalizePathRegexp, '/')
}

export function resolveFrom(base: string, value: string): string {
  return normalizePath(path.isAbsolute(value) ? path.relative(base, value) : path.join(base, value))
}

export function resolveSWSrc(base: string, value: string): string {
  return normalizePath(path.isAbsolute(value) ? path.relative(base, value) : value)
}

export function isAbsolute(url: string) {
  return url.match(/^(?:[a-z]+:)?\/\//i)
}

export function resolveBasePath(base: string) {
  if (isAbsolute(base))
    return base
  return (!base.startsWith('/') && !base.startsWith('./'))
    ? `/${base}`
    : base
}

export function prepareAdditionalManifestEntriesGenerator(
  ctx: VitePWAPluginContext<any, any, any, any>,
): () => AsyncGenerator<string | ManifestEntry, undefined, void> {
  return additionalManifestEntriesFactory(ctx, (url) => {
    const buildBase = ctx.resolvedOptions.buildBase!
    return path.resolve(ctx.publicDir, url.startsWith(buildBase) ? url.slice(buildBase.length) : url)
  })
}

/**
 * Loads the default manifest and normalizes the manifest icons' purpose and scope_extensions.
 *
 * **NOTE**: this function calls `prepareManifest` to load the default manifest.
 *
 * @param ctx The resolved Vite PWA plugin context
 */
export function normalizeManifest(
  ctx: VitePWAPluginContext<any, any, any, any>,
) {
  prepareManifest(ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>)
  const manifest = ctx.resolvedOptions.manifest
  // convert icons' purpose
  if (manifest) {
    if (manifest.icons) {
      manifest.icons = manifest.icons.map((icon) => {
        if (icon.purpose && Array.isArray(icon.purpose))
          icon.purpose = icon.purpose.join(' ')

        return icon
      })
    }
    if (manifest.shortcuts) {
      manifest.shortcuts.forEach((shortcut) => {
        if (shortcut.icons) {
          shortcut.icons = shortcut.icons.map((icon) => {
            if (icon.purpose && Array.isArray(icon.purpose))
              icon.purpose = icon.purpose.join(' ')

            return icon
          })
        }
      })
    }

    if (manifest.scope_extensions) {
      manifest.scope_extensions = manifest.scope_extensions.map((scopeExtension) => {
        return {
          origin: scopeExtension.origin,
          type: scopeExtension.type ?? 'origin',
        }
      })
    }
  }
}

export function preparePWAAssetsGenerator<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
) {
  if (ctx.resolvedOptions.pwaAssets && !ctx.resolvedOptions.pwaAssets.disabled) {
    ctx.pwaAssetsGenerator = import('../pwa-assets/generator').then(({ loadInstructions }) => loadInstructions(ctx)).catch((e) => {
      console.error([
        '',
        pc.cyan(`PWA v${ctx.version}`),
        pc.yellow('WARNING: you must install the following dev dependencies to use the PWA assets generator:'),
        pc.yellow('- "@vite-pwa/assets-generator"'),
        pc.yellow('- "sharp" (should be installed when installing @vite-pwa/assets-generator)'),
        pc.yellow('- "sharp-ico" (should be installed when installing @vite-pwa/assets-generator)'),
      ].join('\n'), e)
      return Promise.resolve(undefined)
    })
  }
}

/**
 * Configures the PWA strategy at the resolved PWA options.
 * @param ctx
 * @param cwd
 * @param outDir
 * @param assetsDir
 */
export function preparePWAStrategy<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
  cwd: string,
  outDir: string,
  assetsDir: string,
) {
  const outputPath = path.resolve(cwd, outDir)
  let options: Partial<BasePartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<S, T>
      options = ctx.resolvedOptions.generateSW
      break
    case 'inject-manifest':
      ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<S, T>
      options = ctx.resolvedOptions.injectManifest
      break
    case 'build-sw':
      ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<S, T>
      options = ctx.resolvedOptions.buildSW
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
      let assetsOutputDir = path.relative(outputPath, path.resolve(outputPath, assetsDir))
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
 * @param config The Vite resolved configuration.
 * @param ctx The PWA Vite plugin context.
 */
export async function preparePWAContextDefaults<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  config: ResolvedConfig,
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
): Promise<void> {
  if (ctx.externalConfigurationLoader) {
    return
  }
  await Promise.all([
    import('../config').then(({
      resolvePwaConfiguration,
    }) => resolvePwaConfiguration<UserStrategy, S, T>(
      ctx.consumerOptions,
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
  ctx.resolvedOptions.scope = scope || basePath
  ctx.resolvedOptions.base = buildBase ?? basePath
  ctx.resolvedOptions.buildBase = ctx.resolvedOptions.base
  ctx.strategy = ctx.resolvedOptions.strategy!
  ctx.useImportRegister = false
  ctx.rootDir = config.root
  ctx.publicDir = config.publicDir
  ctx.outDir = config.build.outDir
  ctx.base = config.base
  normalizeManifest(ctx)
  const { outDir = 'dist', assetsDir = 'assets' } = config.build
  const cwd = config.root
  preparePWAStrategy(ctx, cwd, outDir, assetsDir)
  preparePWAAssetsGenerator(ctx)
  // todo: review this for self-destroy-sw
  if (!ctx.devEnvironment && !ctx.resolvedOptions.disable) {
    prepareSwNames(ctx)
  }
}
