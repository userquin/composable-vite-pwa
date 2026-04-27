import type { GenerateSWOptions, SWType } from './types'
import type { GenerateSWResult } from './utils/types'

export async function generateSW<T extends SWType>(options: GenerateSWOptions<T>): Promise<GenerateSWResult<T>> {
  return await import('./utils/build-generate-sw').then(({ buildGenerateSW }) => buildGenerateSW(options))
}
