import type {
  BasePartial,
  ManifestEntry,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, ExtractStrategy, PWAPluginContext } from './context-types'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  ResolvedVitePWAOptions,
  VitePWAStrategy,
} from './types'
import path from 'node:path'
import pc from 'picocolors'
import { additionalManifestEntriesFactory } from './additional-manifest-entries'
import { prepareManifest } from './config'

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
  ctx: PWAPluginContext<any, any, any>,
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
  ctx: PWAPluginContext<any, any, any>,
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
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, T>,
) {
  if (ctx.resolvedOptions.pwaAssets && !ctx.resolvedOptions.pwaAssets.disabled) {
    ctx.pwaAssetsGenerator = import('./pwa-assets/generator').then(({ loadInstructions }) => loadInstructions(ctx)).catch((e) => {
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
 * @param ctx The PWA context.
 * @param cwd The current working directory.
 * @param outDir The output directory.
 * @param immutableAssets The immutable assets directory.
 */
export async function preparePWAStrategy<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, T>,
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
