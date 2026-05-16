import type { BuildResult, SWType } from '../../types'
import type { BuildGenerateSWOptions } from '../types'
import { createGenerateContext } from '@composable-vite-pwa/workbox-build/build/rolldown/build-context'

function prepareRolldownBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: BuildGenerateSWOptions<T>,
  transformESMTargetToRolldown: typeof import('../bundler/utils')['transformESMTargetToRolldown'],
  prepareRolldownBuild: typeof import('../rolldown/build-utils')['prepareRolldownBuild'],
): Promise<any>[] {
  const { logLevel: ll, bundlerLogLevel } = options
  const logLevel = ll === 'silent'
    ? 'silent'
    : bundlerLogLevel!.rolldown!
  return bundlerOptions.map((b) => {
    return prepareRolldownBuild(Object.assign(b, {
      logLevel,
      target: transformESMTargetToRolldown(b.swType, b.target),
      sourcemap: options.sourcemap,
      generateSW: true,
    }))
  })
}

export async function generateSWLegacy<T extends SWType>(
  options: BuildGenerateSWOptions<T>,
): Promise<BuildResult> {
  const buildStart = performance.now()

  const message = await import('./index').then(({
    checkLegacyGenerateSW,
  }) => checkLegacyGenerateSW(true))

  if (message) {
    throw new Error(message)
  }

  const [
    internalGenerateSW,
    transformESMTargetToRolldown,
    prepareRolldownBuild,
  ] = await Promise.all([
    import('../bundler/generate-sw-bundler').then(({ internalGenerateSW }) => internalGenerateSW),
    import('../bundler/utils').then(({ transformESMTargetToRolldown }) => transformESMTargetToRolldown),
    import('../rolldown/build-utils').then(({ prepareRolldownBuild }) => prepareRolldownBuild),
  ])

  const context = createGenerateContext<T>(
    buildStart,
    options,
  )

  return await internalGenerateSW(
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
