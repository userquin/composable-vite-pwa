import type { BuildResult, GenerateSWOptions, SWType } from './types'
import { detectGenerateSWDependencies } from './build/bundler/detector'
import { checkGenerateSWDependencies } from './build/bundler/log'
import { logDeprecatedGenerateSW } from './utils/log'

async function internalGenerateSW<T extends SWType>(
  options: GenerateSWOptions<T>,
  legacy = false,
): Promise<BuildResult> {
  if (legacy) {
    logDeprecatedGenerateSW()
  }

  const detection = await detectGenerateSWDependencies()

  const message = checkGenerateSWDependencies(detection)
  if (message) {
    throw new Error(message)
  }

  return detection.vite
    ? await import('./build/vite/generate-sw').then(({ generateSW }) => generateSW(
        options,
      ))
    : await import('./build/rolldown/generate-sw').then(({ generateSW }) => generateSW(
        options,
      ))
}

export function generateModernSW<T extends SWType>(
  options: GenerateSWOptions<T>,
): Promise<BuildResult> {
  return internalGenerateSW(options)
}

/*!
 * For backward compatibility.
 * @deprecated use generateClassicSW or generateModernSW instead.
 */
export function generateSW(
  options: GenerateSWOptions<'classic'>,
): Promise<BuildResult> {
  return internalGenerateSW(options)
}

export function generateClassicSW(
  options: GenerateSWOptions<'classic'>,
): Promise<BuildResult> {
  return internalGenerateSW(options, false)
}
