import type { BuildResult, SWType } from '../../types'
import type { BuildGenerateSWOptions } from '../types'
import {
  createGenerateContext,
} from '@composable-vite-pwa/workbox-build/build/vite/build-context'

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
  const buildStart = performance.now()

  const message = await import('./index').then(({
    checkGenerateSW,
  }) => checkGenerateSW(true))

  if (message) {
    throw new Error(message)
  }

  const [
    internalGenerateSW,
    prepareViteBuild,
  ] = await Promise.all([
    import('../bundler/generate-sw-bundler').then(({ internalGenerateSW }) => internalGenerateSW),
    import('./build-utils').then(({ prepareViteBuild }) => prepareViteBuild),
  ])

  const context = createGenerateContext<T>(
    buildStart,
    options,
  )

  return await internalGenerateSW(
    'vite',
    buildStart,
    options,
    bundlerOptions => prepareViteBuilds(
      bundlerOptions,
      options,
      prepareViteBuild,
    ),
  )
}
