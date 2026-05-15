import type { BuildResult, SWType } from '../../types'
import type { LegacyBuildServiceWorkerOptions } from './legacy-types'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: LegacyBuildServiceWorkerOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('../rolldown/build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  const { logLevel: ll, bundlerLogLevel } = options
  const logLevel = ll === 'silent'
    ? 'silent'
    : bundlerLogLevel!.rolldown!
  return bundlerOptions.map((b) => {
    const plugins = options.plugins?.() || []
    return prepareRolldownBuild(Object.assign(b, {
      logLevel,
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
  const now = performance.now()

  const message = await import('./index').then(({
    checkLegacyBuildSW,
  }) => checkLegacyBuildSW(options, true))

  if (message) {
    throw new Error(message)
  }

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
    'rolldown',
    now,
    options,
    bundlerOptions => prepareRolldownBuilds(
      bundlerOptions,
      options,
      transformESMTargetToRolldown,
      prepareRolldownBuild,
    ),
  )
}
