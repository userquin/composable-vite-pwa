import type { SWType } from '../../types'
import type { DetectorOptions, DetectorResult } from '../bundler/detector-types'
import type { LegacyBuildServiceWorkerOptions } from './legacy-types'
import type { BuildServiceWorkerOptions } from './types'
import { detect } from '../bundler/detector'
import { checkViteDependencies, checkViteLegacyDependencies } from '../bundler/log'

export type {
  BuildServiceWorkerOptions,
  DetectorOptions,
  DetectorResult,
  LegacyBuildServiceWorkerOptions,
  SWType,
}

export { detect }

export async function checkBuildSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
  forError = false,
): Promise<string | undefined> {
  const detectOptions: DetectorOptions = {
    vite: true,
    magicast: options.customChunks ? true : undefined,
  }

  const detectResult = await import('../bundler/detector').then(({
    detect,
  }) => detect(detectOptions))

  return checkViteDependencies(
    'build',
    forError,
    detectOptions,
    detectResult,
  )
}

export async function checkLegacyBuildSW<T extends SWType>(
  options: LegacyBuildServiceWorkerOptions<T>,
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
    vite: true,
  }

  const detectResult = await import('../bundler/detector').then(({
    detect,
  }) => detect(detectOptions))

  return checkViteDependencies(
    'generate',
    forError,
    detectOptions,
    detectResult,
  )
}

export async function checkLegacyGenerateSW(
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
