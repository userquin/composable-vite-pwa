import type { BuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/rolldown/types'
import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { Strategy, WorkboxBuildConfiguration } from '@composable-vite-pwa/workbox-build/config/types'
import type { GetManifestOptions, InjectManifestOptions, SWType } from '@composable-vite-pwa/workbox-build/types'

function missingOptions(section: string, keys: readonly string[]): never {
  throw new Error(
    `Missing required option${keys.length > 1 ? 's' : ''} "${keys.join('", "')}" `
    + `in the "${section}" section of your workbox config`,
  )
}

export function assertGenerateSWOptions<T extends SWType>(
  options: Partial<BuildGenerateSWOptions<T>> | undefined,
): asserts options is BuildGenerateSWOptions<T> {
  if (!options?.swDest)
    missingOptions('generateSW', ['swDest'])
}

export function assertInjectManifestOptions(
  options: Partial<InjectManifestOptions> | undefined,
): asserts options is InjectManifestOptions {
  const missing = (['swSrc', 'swDest', 'globDirectory'] as const).filter(key => !options?.[key])
  if (missing.length)
    missingOptions('injectManifest', missing)
}

export function assertBuildSWOptions<T extends SWType>(
  options: Partial<BuildServiceWorkerOptions<T>> | undefined,
): asserts options is BuildServiceWorkerOptions<T> {
  const missing = (['swSrc', 'swDest', 'globDirectory'] as const).filter(key => !options?.[key])
  if (missing.length)
    missingOptions('buildSW', missing)
}

export type CliStrategy = Strategy | 'get-manifest'

export type WorkboxCliConfig
  = Omit<Partial<WorkboxBuildConfiguration<Strategy>>, 'strategy'> & {
    strategy?: CliStrategy
    getManifest?: Partial<GetManifestOptions>
  }

export function assertGetManifestOptions(
  options: Partial<GetManifestOptions> | undefined,
): asserts options is GetManifestOptions {
  if (!options?.globDirectory)
    missingOptions('getManifest', ['globDirectory'])
}

export function defineCliOptions<S extends CliStrategy>(
  strategy: S,
  options: Omit<WorkboxCliConfig, 'strategy'> = {},
): WorkboxCliConfig {
  return Object.assign(options, { strategy })
}
