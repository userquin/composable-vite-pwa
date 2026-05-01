import type { BuildSWOptions } from '../build/types'
import type { BuildResult } from '../types'

export async function viteSWBuild(_options: BuildSWOptions): Promise<BuildResult> {
  const _viteVersion = await import('vite').then(({ version }) => version).catch(() => undefined)
  return undefined!
}
