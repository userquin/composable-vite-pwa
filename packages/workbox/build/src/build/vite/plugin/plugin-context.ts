import type { ResolvedConfig } from 'vite'
import type { Strategy } from '../../../config/types'
import type { InjectManifestOptions, SWType } from '../../../types'
import type { DetectorResult } from '../../builder/detector-types'
import type { BuildGenerateSWOptions } from '../../types'
import type { LegacyBuildServiceWorkerOptions } from '../legacy-types'
import type { BuildServiceWorkerOptions } from '../types'
import type { VitePWAPluginOptions } from './types'
import process from 'node:process'

export interface VitePWAPluginContext<
  S extends Strategy,
  T extends SWType,
> {
  isDev: boolean
  options: VitePWAPluginOptions<S, T>
  resolvedOptions: Promise<VitePWAPluginOptions<S, T>>
  detectionResult: Promise<DetectorResult>
  resolvedViteConfig: import('vite').ResolvedConfig
}

export const devPluginName = 'vite-pwa:detector:plugin'

export function preparePluginContext<
  S extends Strategy,
  T extends SWType,
>(
  options: VitePWAPluginOptions<S, T>,
): VitePWAPluginContext<S, T> {
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
  pluginContext: VitePWAPluginContext<S, T>,
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

export type StrategyOptions<T extends SWType>
  = | BuildServiceWorkerOptions<T>
    | LegacyBuildServiceWorkerOptions<T>
    | BuildGenerateSWOptions<T>
    | InjectManifestOptions

export type StrategyOptionsReturn<S extends Strategy, T extends SWType>
  = S extends 'build-sw'
    ? BuildServiceWorkerOptions<T>
    : S extends 'generate-sw'
      ? BuildGenerateSWOptions<T> | LegacyBuildServiceWorkerOptions<T>
      : InjectManifestOptions

export async function prepareStrategyOptions<
  S extends Strategy,
  T extends SWType,
>(
  pluginContext: VitePWAPluginContext<S, T>,
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
