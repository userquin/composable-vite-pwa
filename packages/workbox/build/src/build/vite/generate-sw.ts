import type { BuildResult, SWType } from '../../types'
import type { BuildGenerateSWOptions } from '../types'

function prepareViteBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: BuildGenerateSWOptions<T>,
  prepareViteBuild: typeof import('./build-utils')['prepareViteBuild'],
): Promise<any>[] {
  const { logLevel: ll, bundlerLogLevel } = options
  const logLevel = ll === 'silent'
    ? 'silent'
    : bundlerLogLevel!.vite!
  return bundlerOptions.map((b) => {
    return prepareViteBuild(Object.assign(b, {
      logLevel,
      sourcemap: options.sourcemap,
      generateSW: true,
    }))
  })
}

export async function generateSW<T extends SWType>(
  options: BuildGenerateSWOptions<T>,
): Promise<BuildResult> {
  const now = performance.now()
  const [
    internalGenerateSW,
    prepareViteBuild,
  ] = await Promise.all([
    import('../bundler/generate-sw-bundler').then(({ internalGenerateSW }) => internalGenerateSW),
    import('./build-utils').then(({ prepareViteBuild }) => prepareViteBuild),
  ])
  return await internalGenerateSW(
    'vite',
    now,
    options,
    bundlerOptions => prepareViteBuilds(
      bundlerOptions,
      options,
      prepareViteBuild,
    ),
  )
}
