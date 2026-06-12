import type { BuildServiceWorkerOptions } from './build/rolldown/types'
import type { BuildResult, SWType } from './types'

export async function buildModernSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
): Promise<BuildResult> {
  return await import('./build/build-sw').then(({
    buildSW,
  }) => buildSW(options))
}
