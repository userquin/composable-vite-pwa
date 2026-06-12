import type { BuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/rolldown/types'
import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { Strategy, WorkboxBuildConfiguration } from '@composable-vite-pwa/workbox-build/config/types'
import type { InjectManifestOptions, SWType } from '@composable-vite-pwa/workbox-build/types'

export type WorkboxCliConfig = Partial<WorkboxBuildConfiguration<Strategy>>

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
