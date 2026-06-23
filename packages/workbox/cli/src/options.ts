import type { Strategy, WorkboxBuildConfiguration } from '@composable-vite-pwa/workbox-build/config/types'
import type { GetManifestOptions, SelfDestroyingOptions, SWType } from '@composable-vite-pwa/workbox-build/types'

export type CliStrategy = Strategy | 'get-manifest'
export type StrategyName = CliStrategy | 'self-destroy-sw'

export type WorkboxCliConfig<S extends CliStrategy, T extends SWType>
  = Omit<Partial<WorkboxBuildConfiguration<S extends Strategy ? S : Strategy, T>>, 'strategy' | 'selfDestroying'>
    & {
      strategy?: S
      getManifest?: Partial<GetManifestOptions>
      selfDestroying?: Partial<SelfDestroyingOptions> & { selfDestroying?: boolean }
    }

interface StrategyMeta {
  optionKey: keyof WorkboxCliConfig<CliStrategy, SWType>
  isSwBuilder: boolean
}

export const STRATEGY_META: Record<StrategyName, StrategyMeta> = {
  'generate-sw': { optionKey: 'generateSW', isSwBuilder: true },
  'inject-manifest': { optionKey: 'injectManifest', isSwBuilder: true },
  'build-sw': { optionKey: 'buildSW', isSwBuilder: true },
  'get-manifest': { optionKey: 'getManifest', isSwBuilder: false },
  'self-destroy-sw': { optionKey: 'selfDestroying', isSwBuilder: false },
}

export const STRATEGY_NAMES = Object.keys(STRATEGY_META) as StrategyName[]

export function defineCliOptions<S extends CliStrategy, T extends SWType>(
  strategy: S,
  options: Omit<WorkboxCliConfig<S, T>, 'strategy'> = {},
): WorkboxCliConfig<S, T> {
  return Object.assign(options, { strategy })
}
