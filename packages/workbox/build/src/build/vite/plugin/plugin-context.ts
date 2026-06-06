import type { ResolvedConfig } from 'vite'
import type { Strategy } from '../../../config/types'
import type { InjectManifestOptions, SWType } from '../../../types'
import type { DetectorResult } from '../../builder/detector-types'
import type { BuildGenerateSWOptions } from '../../types'
import type { LegacyBuildServiceWorkerOptions } from '../legacy-types'
import type { BuildServiceWorkerOptions } from '../types'
import type { VitePWAOptions } from './types'
import process from 'node:process'

export interface VitePWAContext<
  S extends Strategy,
  T extends SWType,
> {
  isDev: boolean
  options: VitePWAOptions<S, T>
  resolvedOptions: Promise<VitePWAOptions<S, T>>
  detectionResult: Promise<DetectorResult>
  resolvedViteConfig: import('vite').ResolvedConfig
}

export const devPluginName = 'vite-pwa:detector:plugin'

export function preparePluginContext<
  S extends Strategy,
  T extends SWType,
>(
  options: VitePWAOptions<S, T>,
): VitePWAContext<S, T> {
  return {
    isDev: false,
    options,
    resolvedOptions: import('../../../config/load-configuration').then(({
      loadConfiguration,
    }) => loadConfiguration(options)),
    detectionResult: import('../../builder/detector').then(({
      detect,
    }) => detect({
      vite: true,
      rolldown: true,
      magicast: true,
    })),
    resolvedViteConfig: undefined!,
  }
}

export async function checkStrategy<
  S extends Strategy,
  T extends SWType,
>(
  atDev: boolean,
  pluginContext: VitePWAContext<S, T>,
  resolvedConfig: ResolvedConfig,
) {
  pluginContext.isDev = atDev
  pluginContext.resolvedViteConfig = resolvedConfig
  const [options] = await Promise.all([
    pluginContext.resolvedOptions,
    pluginContext.detectionResult,
  ])

  if (!options.strategy) {
    const message = await import('../../builder/log').then(({
      missingStrategy,
    }) => missingStrategy(
      !atDev,
      'Missing strategy at VitePWAPluginOptions',
    ))
    if (message) {
      if (atDev) {
        console.warn(message)
        return
      }
      throw new Error(message)
    }
  }

  const { vite } = await pluginContext.detectionResult

  let message: string | undefined
  switch (options.strategy) {
    case 'build-sw': {
      if (vite) {
        message = await import('../index').then(({
          checkBuildSW,
        }) => checkBuildSW(
          !atDev,
        ))
      }
      else {
        message = await import('../index').then(({
          checkLegacyBuildSW,
        }) => checkLegacyBuildSW(
          !atDev,
        ))
      }
      break
    }
    case 'generate-sw': {
      if (vite) {
        message = await import('../index').then(({
          checkGenerateSW,
        }) => checkGenerateSW(
          !atDev,
        ))
      }
      else {
        message = await import('../index').then(({
          checkLegacyGenerateSW,
        }) => checkLegacyGenerateSW(
          !atDev,
        ))
      }
      break
    }
  }

  if (message) {
    if (atDev) {
      console.warn(message)
      return
    }
    throw new Error(message)
  }
}

type StrategyOptions<T extends SWType>
  = | BuildServiceWorkerOptions<T>
    | LegacyBuildServiceWorkerOptions<T>
    | BuildGenerateSWOptions<T>
    | InjectManifestOptions

type StrategyOptionsReturn<S extends Strategy, T extends SWType>
  = S extends 'build-sw'
    ? BuildServiceWorkerOptions<T>
    : S extends 'generate-sw'
      ? BuildGenerateSWOptions<T> | LegacyBuildServiceWorkerOptions<T>
      : InjectManifestOptions

async function prepareStrategyOptions<
  S extends Strategy,
  T extends SWType,
>(
  pluginContext: VitePWAContext<S, T>,
  strategyOptions: StrategyOptions<T>,
): Promise<StrategyOptionsReturn<S, T>> {
  const { build, define } = pluginContext.resolvedViteConfig

  const { outDir = 'dist', assetsDir = 'assets' } = build

  const {
    resolveSWSrc,
    resolveFrom,
    resolveOutputPath,
  } = await import('../../../utils/resolve-paths')

  const cwd = process.cwd()
  const outputPath = resolveOutputPath(cwd, outDir)

  const data = Object.assign({}, strategyOptions) as StrategyOptionsReturn<S, T>
  data.globDirectory = data.globDirectory
    ? resolveFrom(cwd, data.globDirectory)
    : outputPath

  if (!('dontCacheBustURLsMatching' in strategyOptions)) {
    let assetsOutputDir = resolveFrom(cwd, assetsDir)
    if (assetsOutputDir.at(-1) !== '/')
      assetsOutputDir += '/'

    // remove './' prefix from assetsDir
    data.dontCacheBustURLsMatching = new RegExp(`^${assetsOutputDir.replace(/^\.*\//, '')}`)
  }

  if ('swSrc' in data) {
    data.swSrc = resolveSWSrc(cwd, data.swSrc)
  }

  if ('swDest' in data) {
    data.swDest = resolveFrom(outputPath, data.swDest)
  }

  if (pluginContext.options.strategy === 'generate-sw') {
    // data. define
  }

  return data
}

export async function handleBuild<
  S extends Strategy,
  T extends SWType,
>(
  pluginContext: VitePWAContext<S, T>,
  resolvedPluginOptions: VitePWAOptions<S, T>,
  vite: boolean,
) {
  switch (resolvedPluginOptions.strategy) {
    case 'build-sw': {
      if (vite) {
        const [
          buildSW,
          buildSWOptions,
        ] = await Promise.all([
          import('../build-sw').then(({ buildSW }) => buildSW),
          prepareStrategyOptions(
            pluginContext,
            (resolvedPluginOptions.buildSW ?? {}) as StrategyOptions<T>,
          ),
        ])
        await buildSW(
          buildSWOptions as import('../types').BuildServiceWorkerOptions<T>,
        )
      }
      else {
        const [
          buildSWLegacy,
          buildSWLegacyOptions,
        ] = await Promise.all([
          import('../legacy-build-sw').then(({ buildSWLegacy }) => buildSWLegacy),
          prepareStrategyOptions(
            pluginContext,
            (resolvedPluginOptions.buildSW ?? {}) as StrategyOptions<T>,
          ),
        ])
        await buildSWLegacy(
          buildSWLegacyOptions as import('../legacy-types').LegacyBuildServiceWorkerOptions<T>,
        )
      }
      break
    }
    case 'generate-sw': {
      if (vite) {
        const [
          generateSW,
          generateSWOptions,
        ] = await Promise.all([
          import('../generate-sw').then(({ generateSW }) => generateSW),
          prepareStrategyOptions(
            pluginContext,
            (resolvedPluginOptions.generateSW ?? {}) as StrategyOptions<T>,
          ),
        ])
        await generateSW(
          generateSWOptions,
        )
      }
      else {
        const [
          generateSWLegacy,
          generateSWLegacyOptions,
        ] = await Promise.all([
          import('../legacy-generate-sw').then(({ generateSWLegacy }) => generateSWLegacy),
          prepareStrategyOptions(
            pluginContext,
            (resolvedPluginOptions.generateSW ?? {}) as StrategyOptions<T>,
          ),
        ])
        await generateSWLegacy(
          generateSWLegacyOptions,
        )
      }
      break
    }
    case 'inject-manifest': {
      const [
        injectManifest,
        injectManifestOptions,
      ] = await Promise.all([
        import('../../../inject-manifest').then(({ injectManifest }) => injectManifest),
        prepareStrategyOptions(
          pluginContext,
          (resolvedPluginOptions.injectManifest ?? {}) as StrategyOptions<T>,
        ),
      ])
      await injectManifest(
        injectManifestOptions as InjectManifestOptions,
      )
    }
  }
}
