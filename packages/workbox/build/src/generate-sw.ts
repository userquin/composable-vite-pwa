import type { BuildResult, GenerateSWOptions, SWType } from './types'

export async function generateModernSW<T extends SWType>(
  options: GenerateSWOptions<T>,
): Promise<BuildResult> {
  return await import('./build/generate-sw').then(({
    generateSW,
  }) => generateSW(options))
}

/*!
 * For backward compatibility.
 * @deprecated use generateClassicSW or generateModernSW instead.
 */
export async function generateSW(
  options: GenerateSWOptions<'classic'>,
): Promise<BuildResult> {
  return await import('./build/bundler/log').then(({
    logDeprecatedGenerateSW,
  }) => {
    logDeprecatedGenerateSW()
    return generateModernSW(options)
  })
}

export function generateClassicSW(
  options: GenerateSWOptions<'classic'>,
): Promise<BuildResult> {
  return generateModernSW(options)
}
