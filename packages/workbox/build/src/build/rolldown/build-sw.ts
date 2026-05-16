import type { BuildResult, SWType } from '../../types'
import type { BuildServiceWorkerOptions } from './types'
import { createBuildContext } from './build-context'

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
  const withCustomChunks = !!options.customChunks

  return bundlerOptions.map(async (b) => {
    b.detectCircularDeps = withCustomChunks ? true : undefined
    const plugins = options.plugins?.() || []
    return await prepareRolldownBuild(Object.assign(b, {
      customChunks: options.customChunks,
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
  const buildStart = performance.now()

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

  const context = createBuildContext<T>(
    buildStart,
    options,
  )

  return await internalBuildSW(
    'rolldown',
    buildStart,
    options,
    bundlerOptions => prepareRolldownBuilds(
      bundlerOptions,
      options,
      transformESMTargetToRolldown,
      prepareRolldownBuild,
    ),
  )
}
