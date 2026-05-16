import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { SWType } from '../../types'
import type { RolldownBuildContext, RolldownGenerateSWContext } from './internal-types'
import type { BuildServiceWorkerOptions } from './types'
import { createBuildSWContext, createGenerateSWContext } from '../bundler/build-context'

export function createBuildContext<T extends SWType>(
  buildStart: ReturnType<typeof performance.now>,
  options: BuildServiceWorkerOptions<T>,
): RolldownBuildContext<T> {
  return createBuildSWContext(buildStart, 'rolldown', options)
}

export function createGenerateContext<T extends SWType>(
  buildStart: ReturnType<typeof performance.now>,
  options: BuildGenerateSWOptions<T>,
): RolldownGenerateSWContext<T> {
  return createGenerateSWContext(buildStart, 'rolldown', options)
}
