import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  BasePartial,
  GlobPartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { TanStackPWAOptions } from './types'
import process from 'node:process'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'

export type TanStackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<'vite', UserStrategy, T> & {
  tanstack: {
    buildSWAlias: Record<string, string>
  }
}

export function createTanStackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<TanStackPWAOptions<UserStrategy, T>>,
): TanStackPWAContext<UserStrategy, T> {
  // tanstack pwa integration doesn't support inject register
  options.injectRegister = false

  const ctx = Object.assign(
    createVitePWAContext(true, options),
    {
      hmrRequiresSwitcher: true,
      tanstack: {
        /**
         * Alias for `build-sw` strategy if any, check `TanStackNitroPWAContext`.
         */
        buildSWAlias: {},
      },
    },
  ) as TanStackPWAContext<UserStrategy, T>

  // if using nitro v3, this won't be called from main plugin at unplugin-pwa
  // nitro vite plugin here will set ctx.externalConfigurationLoader to true
  // and will initialize build configuration
  ctx.configurePWAOptions = async (_forClient, resolvedConfig) => {
    let options: Partial<BasePartial & GlobPartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
    switch (ctx.strategy) {
      case 'generate-sw':
        ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
        options = ctx.resolvedOptions.generateSW
        if (!('navigateFallback' in ctx.resolvedOptions.generateSW!)) {
          ctx.resolvedOptions.generateSW!.navigateFallback = ctx.base ?? '/'
        }
        break
      case 'inject-manifest':
        ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
        options = ctx.resolvedOptions.injectManifest
        break
      case 'build-sw':
        ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
        ctx.resolvedOptions.buildSW!.alias = ctx.tanstack.buildSWAlias
        options = ctx.resolvedOptions.buildSW
        break
    }

    if (ctx.devEnvironment) {
      return
    }

    if (ctx.outDir.endsWith('/')) {
      ctx.outDir = ctx.outDir.slice(0, ctx.outDir.length - 1)
    }
    ctx.resolvedOptions.outDir = ctx.outDir
    const immutableAssets = resolvedConfig.build.assetsDir ?? 'assets/'

    const cwd = process.cwd()

    if (!options) {
      return {
        cwd,
        outDir: ctx.outDir,
        immutableAssets,
      }
    }

    options.globDirectory = ctx.outDir

    if (!('globPatterns' in options)) {
      options.globPatterns = ['**/*.{js,css,html}']
    }

    if (ctx.resolvedOptions.pwaAssets) {
      ctx.resolvedOptions.pwaAssets.integration = {
        baseUrl: ctx.base,
        publicDir: resolvedConfig.publicDir || 'public',
        outDir: ctx.outDir,
      }
    }

    options.manifestTransforms ??= []
    options.manifestTransforms.push(
      await import('./create-manifest-transform').then(({
        createManifestTransform,
      }) => createManifestTransform(
        ctx.base || '/',
      )),
    )

    // use the same vite folder
    return {
      cwd,
      outDir: ctx.outDir,
      immutableAssets,
    }
  }

  return ctx
}
