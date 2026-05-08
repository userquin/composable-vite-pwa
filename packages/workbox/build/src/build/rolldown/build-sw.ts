import type { BuildResult, SWType } from '../../types'
import type { BundlerOptions } from '../bundler/bundler-types'
import type { BuildServiceWorkerOptions } from './types'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: BundlerOptions[],
  options: BuildServiceWorkerOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('./build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  return bundlerOptions.map(async (b) => {
    const plugins = options.plugins?.() || []
    return await prepareRolldownBuild(Object.assign(b, {
      target: transformESMTargetToRolldown(b.swType, b.target),
      plugins: plugins.filter(Boolean),
      sourcemap: options.sourcemap,
      generateSW: false,
    }))
  })
}

export async function buildSW<T extends SWType>(
  options: BuildServiceWorkerOptions<T>,
): Promise<BuildResult> {
  const [
    internalBuildSW,
    transformESMTargetToRolldown,
    prepareRolldownBuild,
  ] = await Promise.all([
    import('../bundler/build-sw-bundler').then(({ internalBuildSW }) => internalBuildSW),
    import('../bundler/utils').then(({ transformESMTargetToRolldown }) => transformESMTargetToRolldown),
    import('./build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
  ])
  return await internalBuildSW(
    options,
    bundlerOptions => prepareRolldownBuilds(
      bundlerOptions,
      options,
      transformESMTargetToRolldown,
      prepareRolldownBuild,
    ),
  )
}
