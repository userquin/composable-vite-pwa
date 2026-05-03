import type { BuildGenerateSWOptions, BuildInjectManifestSWOptions, BuildSWOptions } from '../build/types'
import type { BuildResult, SWType } from '../types'

export function isInjectManifestBuild(options: BuildSWOptions<SWType>): options is BuildInjectManifestSWOptions<SWType> {
  return 'injectManifest' in options
}

export function isGenerateSWBuild(options: BuildSWOptions<SWType>): options is BuildGenerateSWOptions<SWType> {
  return 'generateSW' in options
}

export async function viteSWBuild<
  T extends SWType,
  Options extends BuildSWOptions<T>,
>(options: Options): Promise<BuildResult> {
  if (isGenerateSWBuild(options)) {
    return await import('./build-generate-sw').then(({ buildGenerateSW }) => buildGenerateSW(options.generateSW))
  }

  if (isInjectManifestBuild(options)) {
    const viteVersion = await import('vite').then(vite => ({
      version: vite.version,
      rolldown: 'rolldownVersion' in vite,
    }
    )).catch((_error) => {
      // todo: log error
      return undefined
    })
    // todo: prepare vite options
  }

  // todo: throw error
  return undefined!
}
