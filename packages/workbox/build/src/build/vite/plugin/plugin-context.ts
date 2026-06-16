import type { ResolvedConfig } from 'vite'
import type { Strategy } from '../../../config/types'
import type { SWType } from '../../../types'
import type { DetectorResult } from '../../builder/detector-types'
import type { VitePWAOptions } from './types'

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
