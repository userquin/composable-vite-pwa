import type { BuildResult, SWType } from '../../types'
import type { LegacyBuildServiceWorkerOptions } from './legacy-types'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: LegacyBuildServiceWorkerOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('../rolldown/build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  return bundlerOptions.map((b) => {
    const plugins = options.plugins?.() || []
    return prepareRolldownBuild(Object.assign(b, {
      target: transformESMTargetToRolldown(b.swType, b.target),
      plugins: plugins.filter(Boolean),
      sourcemap: options.sourcemap,
      generateSW: false,
    }))
  })
}

export async function buildSWLegacy<T extends SWType>(
  options: LegacyBuildServiceWorkerOptions<T>,
): Promise<BuildResult> {
  const [
    internalBuildSW,
    transformESMTargetToRolldown,
    prepareRolldownBuild,
  ] = await Promise.all([
    import('../bundler/build-sw-bundler').then(({ internalBuildSW }) => internalBuildSW),
    import('../bundler/utils').then(({ transformESMTargetToRolldown }) => transformESMTargetToRolldown),
    import('../rolldown/build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
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
