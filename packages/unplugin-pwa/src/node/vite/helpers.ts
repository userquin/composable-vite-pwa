import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type {
  BasePartial,
  ManifestEntry,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { ResolvedVitePWAOptions, VitePWAStrategy } from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import path from 'node:path'
import { additionalManifestEntriesFactory } from '@composable-vite-pwa/unplugin-pwa/additional-manifest-entries'
import { prepareManifest } from '@composable-vite-pwa/unplugin-pwa/config'
import pc from 'picocolors'

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
  const publicDir = ctx.publicDir
  return additionalManifestEntriesFactory(ctx, (url) => {
    return path.resolve(publicDir, url.startsWith('/') ? url.slice(1) : url)
  })
}

/**
 * This function should be called once the target `bundler` has resolved the following options:
 *   - scope
 *   - basePath
 *
 * **NOTE**: not called at prepareDefaults
 *
 * @param ctx The resolved PWA context
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

export async function prepareDefaults<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  config: ResolvedConfig,
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
): Promise<void> {
  await Promise.all([
    import('../config').then(({
      resolvePwaConfiguration,
    }) => resolvePwaConfiguration<UserStrategy, S, T>(
      ctx.consumerOptions,
    )).then(resolvedOptions => ctx.resolvedOptions = resolvedOptions),
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
  ctx.viteConfig = config
  ctx.useImportRegister = false
  ctx.rootDir = config.root
  ctx.publicDir = config.publicDir
  ctx.outDir = config.build.outDir
  ctx.base = config.base
  normalizeManifest(ctx)
  const { outDir = 'dist', assetsDir = 'assets' } = config.build
  const cwd = config.root
  const outputPath = path.resolve(cwd, outDir)
  let options: Partial<BasePartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      ctx.resolvedOptions.generateSW ??= {}
      options = ctx.resolvedOptions.generateSW
      break
    case 'inject-manifest':
      ctx.resolvedOptions.injectManifest ??= {}
      options = ctx.resolvedOptions.injectManifest
      break
    case 'build-sw':
      ctx.resolvedOptions.buildSW ??= {}
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
    /*
        options.globDirectory = options.globDirectory
          ? normalizePath(path.relative(cwd, resolveFrom(cwd, options.globDirectory)))
          : normalizePath(path.relative(cwd, resolveFrom(cwd, outputPath)))
    */
    if (!('dontCacheBustURLsMatching' in options)) {
      let assetsOutputDir = path.relative(outputPath, path.resolve(outputPath, assetsDir))
      if (assetsOutputDir.at(-1) !== '/')
        assetsOutputDir += '/'

      // remove './' prefix from assetsDir
      Object.assign(options, {
        dontCacheBustURLsMatching: new RegExp(`^${assetsOutputDir.replace(/^\.*\//, '')}`),
      })
      // options.dontCacheBustURLsMatching = new RegExp(`^${assetsOutputDir.replace(/^\.*\//, '')}`)
    }
    if (ctx.strategy !== 'generate-sw') {
      if ('swSrc' in options) {
        Object.assign(options, {
          swSrc: resolveSWSrc(cwd, options.swSrc as string),
        })
        // options.swSrc = resolveSWSrc(cwd, options.swSrc as string)
      }
    }

    if ('swDest' in options && options.swDest) {
      const resolvedSwDest = path.dirname(path.resolve(cwd, options.swDest))
      if (resolvedSwDest !== outputPath) {
        Object.assign(options, {
          swDest: resolveFrom(outputPath, options.swDest),
        })
        // options.swDest = resolveFrom(outputPath, options.swDest)
      }
    }
    else {
      Object.assign(options, {
        swDest: resolveFrom(outputPath, 'sw.js'),
      })
      // options.swDest = resolveFrom(outputPath, 'sw.js')
    }
  }
  else if (ctx.strategy === 'self-destroy-sw' && ctx.resolvedOptions.selfDestroying) {
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
      ctx.resolvedOptions.selfDestroying.swDest = newDestSW
    }
  }

  if (ctx.consumerOptions.pwaAssets && !ctx.consumerOptions.pwaAssets.disabled) {
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
