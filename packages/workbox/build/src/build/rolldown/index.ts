import type { SWType } from '../../types'
import type { DetectorOptions, DetectorResult } from '../bundler/detector-types'
import type { BuildServiceWorkerOptions } from './types'
import { detect } from '../bundler/detector'
import { checkViteLegacyDependencies } from '../bundler/log'

export type {
  BuildServiceWorkerOptions,
  DetectorOptions,
  DetectorResult,
  SWType,
}

export { detect }

export async function checkBuildSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
  forError = false,
): Promise<string | undefined> {
  const detectOptions: DetectorOptions = {
    rolldown: true,
    magicast: options.customChunks ? true : undefined,
  }

  const detectResult = await import('../bundler/detector').then(({
    detect,
  }) => detect(detectOptions))

  return checkViteLegacyDependencies(
    'build',
    forError,
    detectOptions,
    detectResult,
  )
}

export async function checkGenerateSW(
  forError: boolean,
): Promise<string | undefined> {
  const detectOptions: DetectorOptions = {
    rolldown: true,
  }

  const detectResult = await import('../bundler/detector').then(({
    detect,
  }) => detect(detectOptions))

  return checkViteLegacyDependencies(
    'generate',
    forError,
    detectOptions,
    detectResult,
  )
}
