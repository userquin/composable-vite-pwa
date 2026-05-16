import type { BuildResult, SWType } from '../../types'
import type { LegacyBuildServiceWorkerOptions } from './legacy-types'
import { createBuildContext } from '../rolldown/build-context'

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
  const withCustomChunks = !!options.customChunks

  return bundlerOptions.map((b) => {
    const plugins = options.plugins?.() || []
    b.detectCircularDeps = withCustomChunks ? true : undefined
    return prepareRolldownBuild(Object.assign(b, {
      customChunks: options.customChunks,
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
  const buildStart = performance.now()

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
