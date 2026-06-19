import type { Strategy, WorkboxBuildConfiguration } from '@composable-vite-pwa/workbox-build/config/types'
import type { GetManifestOptions, SelfDestroyingOptions } from '@composable-vite-pwa/workbox-build/types'

export type CliStrategy = Strategy | 'get-manifest'

export type WorkboxCliConfig
  = Omit<Partial<WorkboxBuildConfiguration<Strategy>>, 'strategy' | 'selfDestroying'>
    & {
      strategy?: CliStrategy
      getManifest?: Partial<GetManifestOptions>
      selfDestroying?: Partial<SelfDestroyingOptions> & { selfDestroying?: boolean }
    }

export function defineCliOptions<S extends CliStrategy>(
  strategy: S,
  options: Omit<WorkboxCliConfig, 'strategy'> = {},
): WorkboxCliConfig {
  return Object.assign(options, { strategy })
}
