import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ExtractStrategy } from './context-types'
import type { ManifestOptions, ResolvedVitePWAOptions, VitePWAOptions, VitePWAStrategy } from './types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import pc from 'picocolors'
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

  external.path = normalizePath(configPath)

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

function checkInjectRegister<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  strategy: UserStrategy,
  injectRegister: import('@composable-vite-pwa/unplugin-pwa/node/types').VitePWAOptions<UserStrategy, T>['injectRegister'],
  swType: T,
  color: typeof pc.yellow | typeof pc.red,
  buildWarning: string,
): string | undefined {
  return swType === 'classic-and-module' && injectRegister === 'inline'
    ? [
        `\n${color(pc.bold('[Vite PWA]'))} ${color('WRONG CONFIGURATION')}:`,
        `You are using ${pc.cyan('inline')} for inject register with dual service worker registration.`,
        `Specify other value at ${pc.cyan('injectRegister')} option${buildWarning}.\n`,
      ].join('\n')
    : undefined
}

function checkOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  isDev: boolean,
  consumerOptions: Partial<VitePWAOptions<UserStrategy, T>>,
  resolvedOptions: ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>,
): ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T> {
  const isDevEnabled = consumerOptions.devOptions?.enabled === true
  const isWarning = isDev && !isDevEnabled
  const color = isWarning ? pc.yellow : pc.red
  const warning = isWarning ? `, ${pc.yellow('running build command will fail')}` : ''
  let message: string | undefined

  switch (resolvedOptions.strategy) {
    case 'inject-manifest': {
      const { swType } = resolvedOptions.injectManifest!
      if (swType === 'classic-and-module') {
        message = [
          `\n${color(pc.bold('[Vite PWA]'))} ${color('WRONG CONFIGURATION')}:`,
          `You are using ${pc.cyan(consumerOptions.strategies)} with ${pc.cyan(swType)} service worker type.`,
          `Specify ${pc.green('classic')} or ${pc.green('module')} at ${pc.cyan('swType')} option${warning}.\n`,
        ].join('\n')
      }
      break
    }
    case 'generate-sw': {
      message = checkInjectRegister(
        'generate-sw',
        resolvedOptions.injectRegister!,
        resolvedOptions.generateSW!.swType as SWType,
        color,
        warning,
      )
      break
    }
    case 'build-sw': {
      message = checkInjectRegister(
        'build-sw',
        consumerOptions.injectRegister!,
        resolvedOptions.buildSW!.swType as SWType,
        color,
        warning,
      )
      break
    }
  }

  if (message) {
    if (isWarning) {
      console.warn(message)
    }
    else {
      throw new Error(message)
    }
  }

  return resolvedOptions
}

export async function resolvePwaConfiguration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  pwaOptions: Partial<VitePWAOptions<UserStrategy, T>>,
  resolverOptions: {
    /**
     * Whether the current environment is a development environment.
     */
    isDev: boolean
    /**
     * When using `inject-manifest` this must resolve if the strategy is wrong, the default implementation should be:
     * - if the service worker `.ts` or `.mts` then it is `build-sw` strategy (must return false) or
     * - if the service worker inside public dir then it is `build-sw` strategy (must return false)
     */
    isWrongInjectManifest: (swSrc: string) => boolean | Promise<boolean>
  },
): Promise<ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>> {
  const resolvedPath = pwaOptions.path ?? resolveDefaultConfig(pwaOptions.cwd)
  const config = await loadConfiguration(Object.assign(
    {},
    pwaOptions,
    { path: resolvedPath },
  ))
  const {
    pwaAssets,
    filename = 'sw.js',
    strategies = 'generateSW',
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
        console.warn([
          `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('DEPRECATION WARNING')}:`,
          `You are using ${pc.cyan('workbox')} option, which is now deprecated.`,
          `Please replace ${pc.cyan('workbox')} with ${pc.green('generateSW')} option.`,
          `${pc.cyan('workbox')} option will be removed in the next major version.\n`,
        ].join('\n'))
      }
      return checkOptions(
        resolverOptions.isDev,
        pwaOptions,
        Object.assign({}, strategyOptions, {
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
        }) as ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>,
      )
    }
    case 'injectManifest':
    case 'inject-manifest': {
      const swSrcName = pwaOptions.injectManifest?.swSrc
      if (!swSrcName) {
        throw new Error([
          `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('WRONG CONFIGURATION')}:`,
          `You are using ${pc.cyan(strategies)} option without ${pc.cyan('swSrc')} option.\n`,
        ].join('\n'))
      }
      const isTS = swSrcName.endsWith('.ts') || swSrcName.endsWith('.mts')
      const invalidStrategy = isTS || await resolverOptions.isWrongInjectManifest(normalizePath(path.resolve(process.cwd(), swSrcName)))
      if (invalidStrategy) {
        const isWarning = resolverOptions.isDev && !(pwaOptions?.devOptions?.enabled === true)
        const warning = isWarning ? `, ${pc.yellow('running build command will fail')}` : ''
        const color = isWarning ? pc.yellow : pc.red
        const message = [
          `\n${color(pc.bold('[Vite PWA]'))} ${color('WRONG CONFIGURATION')}:`,
          `You are using ${pc.cyan(strategies)} option with a service worker ${isTS ? 'as static asset' : 'using TypeScript'}.`,
          `Please migrate to ${pc.green('buildSW')} option${warning}.`,
          `${pc.cyan(strategies)} option should be only used when you need to inject a manifest into an existing service worker.\n`,
        ].join('\n')
        if (isWarning) {
          console.warn(message)
        }
        else {
          throw new Error(message)
        }

        return checkOptions(
          resolverOptions.isDev,
          pwaOptions,
          Object.assign({}, rest, {
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
            buildSW: Object.assign(rest.injectManifest ?? {}, {
              swDest: filename,
              swType,
              minify,
              maximumFileSizeToCacheInBytes,
              throwMaximumFileSizeToCacheInBytes,
              additionalManifestEntries,
              additionalManifestEntriesGenerator,
            }),
          }) as ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>,
        )
      }

      return checkOptions(
        resolverOptions.isDev,
        pwaOptions,
        Object.assign({}, rest, {
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
            maximumFileSizeToCacheInBytes,
            throwMaximumFileSizeToCacheInBytes,
            additionalManifestEntries,
            additionalManifestEntriesGenerator,
          }),
        }) as ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>,
      )
    }
    case 'build-sw':
    case 'buildSW': {
      return checkOptions(
        resolverOptions.isDev,
        pwaOptions,
        Object.assign({}, rest, {
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
        }) as ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>,
      )
    }
    case 'self-destroy-sw':
    case 'selfDestroySW': {
      return Object.assign({}, rest, { strategy: 'self-destroy-sw' }) as ResolvedVitePWAOptions<ExtractStrategy<UserStrategy>, T>
    }
  }

  // todo: check for injectManifest => this strategy should be build-sw, we need to do some check and warn the consumer

  // todo: add colors and [Vite PWA]
  throw new Error('Unknown strategy, please use one of the following: "generateSW", "injectManifest", "buildSW"')
}
