import type { ConfigurePWAOptionsFn, ExtractStrategy } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { EnvironmentData } from '@composable-vite-pwa/workbox-build/build/types'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { AstroConfig } from 'astro'
import type { AstroExperimentalOptions, AstroPWAOptions } from './types'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'

export interface AstroPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends VitePWAPluginContext<'vite', UserStrategy, T> {
  astro: {
    config: AstroConfig
    devEnvironment: boolean
    previewOrSync: boolean
    doBuild: boolean
    scope: string
    useDirectoryFormat: boolean
    trailingSlash: 'never' | 'always' | 'ignore'
    experimental?: AstroExperimentalOptions
  }
}

export function createAstroPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<AstroPWAOptions<UserStrategy, T>>,
): AstroPWAContext<UserStrategy, T> {
  const { experimental, ...rest } = options || {}

  const ctx = Object.assign(
    createVitePWAContext(true, rest),
    {
      hmrRequiresSwitcher: true,
      astro: {
        config: undefined!,
        devEnvironment: false,
        previewOrSync: false,
        doBuild: false,
        scope: '/',
        trailingSlash: 'ignore',
        useDirectoryFormat: true,
        experimental,
      },
    },
  ) as AstroPWAContext<UserStrategy, T>

  ctx.configurePWAOptions = createPWAConfigurer(ctx)

  return ctx
}

function prepareEnvironment<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: AstroPWAContext<UserStrategy, T>,
  resolvedOptions: import('vite').ResolvedConfig,
) {
  const { define, envDir, envPrefix } = resolvedOptions

  let options: EnvironmentData | undefined
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
    options.envDir = envDir
    if (define) {
      options.define = Object.assign(
        {},
        options.define ?? {},
        define,
      )
    }
    const prefixes = new Set<string>(
      envPrefix
        ? Array.isArray(envPrefix)
          ? envPrefix
          : [envPrefix]
        : [],
    )
    if (options.envPrefix) {
      if (typeof options.envPrefix === 'string') {
        prefixes.add(options.envPrefix)
      }
      else {
        for (const pref of options.envPrefix) {
          prefixes.add(pref)
        }
      }
    }
    if (!prefixes.has('PUBLIC_')) {
      prefixes.add('PUBLIC_')
    }
    options.envPrefix = [...prefixes]
  }
}

function createPWAConfigurer<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: AstroPWAContext<UserStrategy, T>,
): ConfigurePWAOptionsFn {
  return async (_forClient, config) => {
    prepareEnvironment(ctx, config)
    if (ctx.astro.devEnvironment) {
      ctx.devEnvironment = true
      return undefined
    }

    return await import('./prepare-build-context').then(({
      prepareBuildContext,
    }) => prepareBuildContext(ctx, config))
  }
}
