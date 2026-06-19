import type { Strategy, WorkboxBuildConfiguration } from '@composable-vite-pwa/workbox-build/config/types'
import type { GetManifestOptions, SelfDestroyingOptions, SWType } from '@composable-vite-pwa/workbox-build/types'

export type CliStrategy = Strategy | 'get-manifest'

export type WorkboxCliConfig<S extends CliStrategy, T extends SWType>
  = Omit<Partial<WorkboxBuildConfiguration<S extends Strategy ? S : Strategy, T>>, 'strategy' | 'selfDestroying'>
    & {
      strategy?: S
      getManifest?: Partial<GetManifestOptions>
      selfDestroying?: Partial<SelfDestroyingOptions> & { selfDestroying?: boolean }
    }

export function defineCliOptions<S extends CliStrategy, T extends SWType>(
  strategy: S,
  options: Omit<WorkboxCliConfig<S, T>, 'strategy'> = {},
): WorkboxCliConfig<S, T> {
  return Object.assign(options, { strategy })
}
