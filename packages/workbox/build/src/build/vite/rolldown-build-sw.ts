import type { BuildResult, SWType } from '../../types'
import type { BundlerOptions } from '../bundler/bundler-types'
import type { BuildServiceWorkerOptions, ServiceWorkerOptions } from './types'

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

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: BundlerOptions[],
  options: BuildServiceWorkerOptions<T>,
  asyncFlatten: typeof import('../bundler/utils')['asyncFlatten'],
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('../rolldown/build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  return bundlerOptions.map(async (b) => {
    await import('../bundler/bundler-types')
    return await prepareBuildSWPlugins(
      options.plugins,
      asyncFlatten,
    ).then((plugins) => {
      return prepareRolldownBuild(Object.assign(b, {
        target: transformESMTargetToRolldown(b.swType, b.target),
        plugins: plugins as any[],
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
    { asyncFlatten, transformESMTargetToRolldown },
    prepareRolldownBuild,
  ] = await Promise.all([
    import('../bundler/build-sw-bundler').then(({ internalBuildSW }) => internalBuildSW),
    import('../bundler/utils').then(({
      asyncFlatten,
      transformESMTargetToRolldown,
    }) => ({
      asyncFlatten,
      transformESMTargetToRolldown,
    })),
    import('../rolldown/build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
  ])
  return await internalBuildSW(
    options,
    bundlerOptions => prepareRolldownBuilds(
      bundlerOptions,
      options,
      asyncFlatten,
      transformESMTargetToRolldown,
      prepareRolldownBuild,
    ),
  )
}
