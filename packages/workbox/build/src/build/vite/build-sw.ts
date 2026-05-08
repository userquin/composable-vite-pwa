import type { BuildResult, SWType } from '../../types'
import type { BundlerOptions } from '../bundler/bundler-types'
import type {
  BuildServiceWorkerOptions,
  ServiceWorkerOptions,
} from './types'

async function prepareBuildSWPlugins(
  plugins: ServiceWorkerOptions['plugins'],
  asyncFlatten: typeof import('../bundler/utils')['asyncFlatten'],
): Promise<import('vite').PluginOption[]> {
  const pluginsFactoryResult = plugins ? plugins() : []
  const pluginsArray = Array.isArray(pluginsFactoryResult)
    ? pluginsFactoryResult
    : [pluginsFactoryResult]
  return plugins ? await asyncFlatten(pluginsArray) : []
}

function prepareViteBuilds<T extends SWType>(
  bundlerOptions: BundlerOptions[],
  options: BuildServiceWorkerOptions<T>,
  prepareViteBuild: typeof import('./build-utils')['prepareViteBuild'],
  asyncFlatten: typeof import('../bundler/utils')['asyncFlatten'],
): Promise<any>[] {
  return bundlerOptions.map(async (b) => {
    return await prepareBuildSWPlugins(
      options.plugins,
      asyncFlatten,
    ).then((plugins) => {
      return prepareViteBuild(Object.assign(b, {
        plugins,
        envDir: options.envDir,
        envPrefix: options.envPrefix,
        sourcemap: options.sourcemap,
        generateSW: false,
      }))
    })
  })
}

export async function buildSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
): Promise<BuildResult> {
  const [
    internalBuildSW,
    asyncFlatten,
    prepareViteBuild,
  ] = await Promise.all([
    import('../bundler/build-sw-bundler').then(({ internalBuildSW }) => internalBuildSW),
    import('./build-utils').then(({ prepareViteBuild }) => prepareViteBuild),
    import('../bundler/utils').then(({ asyncFlatten }) => asyncFlatten),
  ])
  return await internalBuildSW(
    options,
    bundlerOptions => prepareViteBuilds(
      bundlerOptions,
      options,
      asyncFlatten,
      prepareViteBuild,
    ),
  )
}
