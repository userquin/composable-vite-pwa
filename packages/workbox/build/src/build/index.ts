import type { BuildResult, SWType } from '../types'
import type { BuildSWOptions } from './types'

export async function buildSW<T extends SWType, Options extends BuildSWOptions<T>>(options: Options): Promise<BuildResult> {
  return await import('../utils/internal-vite-build').then(({ viteSWBuild }) => viteSWBuild(options))
}
