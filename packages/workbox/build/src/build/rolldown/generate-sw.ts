import type { BuildResult, SWType } from '../../types'
import type { BuildGenerateSWOptions } from '../types'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: BuildGenerateSWOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('./build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  return bundlerOptions.map((b) => {
    return prepareRolldownBuild(Object.assign(b, {
      target: transformESMTargetToRolldown(b.swType, b.target),
      sourcemap: options.sourcemap,
      generateSW: true,
    }))
  })
}

export async function generateSW<T extends SWType>(
  options: BuildGenerateSWOptions<T>,
): Promise<BuildResult> {
  const [
    internalGenerateSW,
    transformESMTargetToRolldown,
    prepareRolldownBuild,
  ] = await Promise.all([
    import('../bundler/generate-sw-bundler').then(({ internalGenerateSW }) => internalGenerateSW),
    import('../bundler/utils').then(({ transformESMTargetToRolldown }) => transformESMTargetToRolldown),
    import('./build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
  ])
  return await internalGenerateSW(
    options,
    bundlerOptions => prepareRolldownBuilds(
      bundlerOptions,
      options,
      transformESMTargetToRolldown,
      prepareRolldownBuild,
    ),
  )
}
