import type { BuildServiceWorkerOptions, SWType } from '../../build/rolldown/index'
import type { BuildGenerateSWOptions } from '../../build/types'
import type { Strategy, WorkboxBuildConfiguration } from '../../config/types'
import type { InjectManifestOptions } from '../../types'

export async function internalWebpackBuild<
  S extends Strategy,
  T extends SWType = 'classic',
>(
  pluginName: string,
  globDirectory?: string,
  options: Partial<WorkboxBuildConfiguration<S, T>> = {},
) {
  const { strategy, buildSW, generateSW, injectManifest } = options

  // We extract Rspack's configured output directory to use as our globDirectory

  switch (strategy) {
    case 'build-sw': {
      const { buildSW: runBuildSW } = await import('../rolldown/build-sw')

      // Safely extract options using your null-coalescing strategy and cast to the proper core type
      const data = (buildSW?.options ?? {}) as BuildServiceWorkerOptions<T>
      if (!('globDirectory' in data) && globDirectory) {
        Object.assign(data, { globDirectory })
      }
      await runBuildSW(data)
      break
    }

    case 'generate-sw': {
      const { generateSW: runGenerateSW } = await import('../rolldown/generate-sw')

      // Safely extract options using your null-coalescing strategy and cast to the proper core type
      const data = (generateSW?.options ?? {}) as BuildGenerateSWOptions<T>
      if (!('globDirectory' in data) && globDirectory) {
        Object.assign(data, { globDirectory })
      }

      await runGenerateSW(data)
      break
    }

    case 'inject-manifest': {
      const { injectManifest: runInjectManifest } = await import('../../inject-manifest')

      // Safely extract options using your null-coalescing strategy and cast to the proper core type
      const data = (injectManifest?.options ?? {}) as InjectManifestOptions
      if (!('globDirectory' in data) && globDirectory) {
        Object.assign(data, { globDirectory })
      }
      await runInjectManifest(data)
      break
    }

    default: {
      throw new Error(`[${pluginName}] Unsupported workflow strategy: "${strategy}"`)
    }
  }
}
