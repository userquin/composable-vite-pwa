import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ManifestOptions, ResolvedVitePWAOptions, VitePWAOptions, VitePWAStrategy } from './types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { resolvePWAAssetsOptions } from './pwa-assets/options'

function deepMergeObject(magicast: any, object: any) {
  if (typeof object === 'object' && object !== null) {
    for (const key in object) {
      const magicastValue = magicast[key]
      const objectValue = object[key]

      // Check for identity to prevent infinite recursion
      if (magicastValue === objectValue) {
        continue
      }

      if (
        typeof magicastValue === 'object'
        && magicastValue !== null
        && typeof objectValue === 'object'
        && objectValue !== null
      ) {
        deepMergeObject(magicastValue, objectValue)
      }
      else {
        magicast[key] = objectValue
      }
    }
  }
}

export const DEFAULT_CONFIG_FILES = [
  'pwa.config.js',
  'pwa.config.ts',
  'pwa.config.mjs',
  'pwa.config.mts',
] as const

export type LoaderType<
  S extends VitePWAStrategy,
  T extends SWType,
> = VitePWAOptions<S, T> | (() => VitePWAOptions<S, T>) | (() => Promise<VitePWAOptions<S, T>>)

export async function loadConfiguration<
  S extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<VitePWAOptions<S, T>>,
): Promise<Partial<VitePWAOptions<S, T>>> {
  if (!options.path) {
    return options
  }

  const cwd = path.resolve(process.cwd(), options.cwd || '.')
  const configPath = path.isAbsolute(options.path)
    ? options.path
    : path.resolve(cwd, options.path)
  const configModule: LoaderType<S, T> = await import(
    pathToFileURL(configPath).href,
  ).then((m: any) => m.default ?? m.options ?? m.config ?? m)

  const config = typeof configModule === 'function'
    ? await configModule()
    : configModule

  const external = config as Partial<VitePWAOptions<S, T>>

  if (options.mergeOptions) {
    deepMergeObject(external, options)
  }

  return external
}

export function resolveDefaultConfig(cwd: string = process.cwd()): string | undefined {
  for (const name of DEFAULT_CONFIG_FILES) {
    const candidate = path.resolve(cwd, name)
    if (fs.existsSync(candidate))
      return candidate
  }
  return undefined
}

/**
 * Loads the default manifest using the `package.json` file.
 *
 * @param options The resolved PWA options.
 */
export function prepareManifest(
  options: ResolvedVitePWAOptions<any, any>,
) {
  if (options.manifest === false) {
    return
  }

  const pkg = fs.existsSync('package.json')
    ? JSON.parse(fs.readFileSync('package.json', 'utf-8'))
    : {}

  options.manifest = Object.assign({}, {
    name: pkg.name,
    short_name: pkg.name,
    description: pkg.description,
    start_url: options.base,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#42b883',
    lang: 'en',
    scope: options.scope,
  }, options.manifest ?? {}) as ManifestOptions
}

export async function resolvePwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(options: Partial<VitePWAOptions<UserStrategy, T>>): Promise<ResolvedVitePWAOptions<S, T>> {
  const resolvedPath = options.path ?? resolveDefaultConfig(options.cwd)
  const config = await loadConfiguration(Object.assign(
    {},
    options,
    { path: resolvedPath },
  ))
  const {
    pwaAssets,
    filename = 'sw.js',
    strategies,
    swType,
    includeManifest = true,
    includeManifestIcons = true,
    includeManifestShortcutIcons = true,
    includeManifestScreenshots = false,
    disable = false,
    injectRegister = 'auto',
    registerType = 'prompt',
    useCredentials = false,
    manifestFilename = 'manifest.webmanifest',
    minify,
    maximumFileSizeToCacheInBytes,
    throwMaximumFileSizeToCacheInBytes,
    additionalManifestEntries,
    additionalManifestEntriesGenerator,
    manifest,
    updateViaCache = 'imports',
    ...rest
  } = config
  const resolvedPwaAssets = resolvePWAAssetsOptions(pwaAssets)
  switch (strategies) {
    case 'generateSW':
    case 'generate-sw': {
      const { workbox, generateSW, ...strategyOptions } = rest
      if (workbox && !generateSW) {
        // todo: warn here
      }
      return Object.assign({}, strategyOptions, {
        strategy: 'generate-sw',
        swType,
        includeManifest,
        includeManifestIcons,
        includeManifestShortcutIcons,
        includeManifestScreenshots,
        disable,
        injectRegister,
        registerType,
        useCredentials,
        manifest,
        manifestFilename,
        minify,
        updateViaCache,
        pwaAssets: resolvedPwaAssets,
      }, {
        generateSW: Object.assign(generateSW ?? workbox ?? {}, {
          swDest: filename,
          swType,
          minify,
          maximumFileSizeToCacheInBytes,
          throwMaximumFileSizeToCacheInBytes,
          additionalManifestEntries,
          additionalManifestEntriesGenerator,
        }),
      }) as ResolvedVitePWAOptions<S, T>
    }
    case 'injectManifest':
    case 'inject-manifest': {
      return Object.assign({}, rest, {
        strategy: 'inject-manifest',
        swType,
        includeManifest,
        includeManifestIcons,
        includeManifestShortcutIcons,
        includeManifestScreenshots,
        disable,
        injectRegister,
        registerType,
        useCredentials,
        manifest,
        manifestFilename,
        minify,
        updateViaCache,
        pwaAssets: resolvedPwaAssets,
      }, {
        injectManifest: Object.assign(rest.injectManifest ?? {}, {
          swDest: filename,
          swType,
          minify,
          maximumFileSizeToCacheInBytes,
          throwMaximumFileSizeToCacheInBytes,
          additionalManifestEntries,
          additionalManifestEntriesGenerator,
        }),
      }) as ResolvedVitePWAOptions<S, T>
    }
    case 'build-sw':
    case 'buildSW': {
      return Object.assign({}, rest, {
        strategy: 'build-sw',
        swType,
        includeManifest,
        includeManifestIcons,
        includeManifestShortcutIcons,
        includeManifestScreenshots,
        disable,
        injectRegister,
        registerType,
        useCredentials,
        manifest,
        manifestFilename,
        minify,
        updateViaCache,
        pwaAssets: resolvedPwaAssets,
      }, {
        buildSW: Object.assign(rest.buildSW ?? {}, {
          swDest: filename,
          swType,
          minify,
          maximumFileSizeToCacheInBytes,
          throwMaximumFileSizeToCacheInBytes,
          additionalManifestEntries,
          additionalManifestEntriesGenerator,
        }),
      }) as ResolvedVitePWAOptions<S, T>
    }
    case 'self-destroy-sw':
    case 'selfDestroySW': {
      return Object.assign({}, rest, { strategy: 'self-destroy-sw' }) as ResolvedVitePWAOptions<S, T>
    }
  }

  // todo: check for injectManifest => this strategy should be build-sw, we need to do some check and warn the consumer

  // todo: add colors and [Vite PWA]
  throw new Error('Unknown strategy, please use one of the following: "generateSW", "injectManifest", "buildSW"')
}
