import type { BuildResult } from '../types'
import type { BuildSWOptions } from './types'

export async function buildSW(options: BuildSWOptions): Promise<BuildResult> {
  return await import('../utils/internal-vite-build').then(({ viteSWBuild }) => viteSWBuild(options))
}
