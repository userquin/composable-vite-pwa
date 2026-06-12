import type { BuildResult, SWType } from '../types'
import type { BuildServiceWorkerOptions } from './rolldown/types'
import { detectBuildSWDependencies } from './builder/detector'

export async function buildSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
): Promise<BuildResult> {
  const detection = await detectBuildSWDependencies()

  return detection.vite
    ? await import('./vite/build-sw').then(({ buildSW }) => buildSW(
        options,
      ))
    : await import('./rolldown/build-sw').then(({ buildSW }) => buildSW(
        options,
      ))
}
