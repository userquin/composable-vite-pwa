import type { BuildResult, GenerateSWOptions, SWType } from './types'

export async function generateSW<T extends SWType>(options: GenerateSWOptions<T>): Promise<BuildResult> {
  return await import('./utils/build-generate-sw').then(({ buildGenerateSW }) => buildGenerateSW(options))
}
