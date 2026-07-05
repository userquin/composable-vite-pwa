import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, PWAPluginContext } from './context-types'
import type { VitePWAStrategy } from './types'
import { resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export type DependenciesResolved = NonNullable<Pick<import('rolldown').Plugin, 'resolveId' | 'load'>>

/**
 * This module will build `registerSW` or any virtual module.
 * @param code The code to build.
 * @param ctx The context of the PWA bundler.
 * @param resolver Rolldown hooks to resolve dependencies.
 */
export async function buildPwaAsset<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  code: string,
  ctx: PWAPluginContext<B, UserStrategy, T>,
  resolver?: DependenciesResolved,
): Promise<string> {
  const { filename = 'sw.js' } = ctx.consumerOptions
  const {
    strategy,
    scope,
    buildBase,
    base: useBase,
    buildSW,
    injectManifest,
    updateViaCache,
  } = ctx.resolvedOptions
  const useGenerateSW = strategy === 'generate-sw'

  const {
    swDestPath,
    classicSWDestPath,
    moduleSWDestPath,
  } = resolveSWNames(
    filename,
    strategy === 'generate-sw'
      ? ''
      : strategy === 'build-sw'
        ? buildSW!.swSrc!
        : injectManifest!.swSrc!,
    useGenerateSW,
  )

  let swType: 'classic' | 'module' = 'classic'
  if (ctx.devEnvironment) {
    if (ctx.resolvedOptions.devOptions?.type === 'module') {
      swType = 'module'
    }
  }
  else if (ctx.resolvedOptions.swType === 'module') {
    swType = 'module'
  }

  const devEnabled = ctx.resolvedOptions.devOptions?.enabled === true

  const base = ctx.devEnvironment ? useBase : buildBase

  return await buildPwaAssetWithRolldown(
    code,
    {
      'import.meta.PWA_ESM_FALLBACK_SW': JSON.stringify(ctx.resolvedOptions.swType === 'classic-and-module'),
      'import.meta.PWA_SELF_DESTROYING_SW': JSON.stringify(ctx.strategy === 'self-destroy-sw'),
      'import.meta.PWA_SW_URL': JSON.stringify(`${base}${swDestPath}`),
      'import.meta.PWA_SW_CLASSIC_URL': JSON.stringify(`${base}${classicSWDestPath}`),
      'import.meta.PWA_SW_MODULE_URL': JSON.stringify(`${base}${moduleSWDestPath}`),
      'import.meta.PWA_SW_SCOPE': JSON.stringify(scope),
      'import.meta.PWA_SW_TYPE': JSON.stringify(swType),
      'import.meta.PWA_SW_UPDATE_VIA_CACHE': JSON.stringify(updateViaCache),
      'import.meta.PWA_DEV_SERVER': JSON.stringify(ctx.devEnvironment),
      // HMR
      'import.meta.PWA_SW_AUTO_UPDATE': JSON.stringify(ctx.resolvedOptions.registerType === 'autoUpdate'),
      'import.meta.PWA_DEV_ENABLED': JSON.stringify(devEnabled),
      'import.meta.PWA_DEV_UI_ENABLED': JSON.stringify(devEnabled && ctx.resolvedOptions.devOptions?.enableUISwitcher === true),
      'import.meta.PWA_DEV_CURRENT_SW_TYPE': JSON.stringify(ctx.dev.options!.swType),
    },
    ctx.devEnvironment,
    ctx.resolvedOptions.minify!,
    resolver,
  )
}

async function buildPwaAssetWithRolldown(
  code: string,
  define: Record<string, any>,
  isDev: boolean,
  minify: boolean,
  resolver?: DependenciesResolved,
): Promise<string> {
  const { rolldown } = await import('rolldown')

  const input = 'asset.js'

  const plugins: import('rolldown').Plugin[] = [{
    name: 'pwa-asset-resolver',
    resolveId(id) {
      return id === input ? input : undefined
    },
    load(id) {
      return id === input ? code : undefined
    },
  }]

  if (resolver) {
    plugins.push({
      name: 'pwa-asset-custom-resolver',
      resolveId: resolver.resolveId,
      load: resolver.load,
    })
  }

  const bundle = await rolldown({
    input,
    platform: 'browser',
    treeshake: true,
    logLevel: 'warn',
    plugins,
    transform: {
      define,
    },
  })

  // in memory build
  const result = await bundle.generate({
    format: 'esm',
    topLevelVar: true,
    cleanDir: false,
    comments: {
      legal: !isDev && !minify,
      jsdoc: false,
      annotation: false,
    },
    minify: isDev ? false : minify,
    codeSplitting: false,
  })

  const chunk = result.output.find(e => e.fileName === input && e.type === 'chunk') as import('rolldown').OutputChunk

  return chunk.code
}
