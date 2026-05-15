import type { BuildResult, SWType } from '../../types'
import type { BuildServiceWorkerOptions } from './types'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: BuildServiceWorkerOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('./build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  const { logLevel: ll, bundlerLogLevel } = options
  const logLevel = ll === 'silent'
    ? 'silent'
    : bundlerLogLevel!.rolldown!
  return bundlerOptions.map(async (b) => {
    const plugins = options.plugins?.() || []
    return await prepareRolldownBuild(Object.assign(b, {
      logLevel,
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
  const now = performance.now()

  const message = await import('./index').then(({
    checkBuildSW,
  }) => checkBuildSW(options, true))

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
    import('./build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
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
