import type { BuildResult, SWType } from '../../types'
import type {
  BuildServiceWorkerOptions,
  ServiceWorkerOptions,
} from './types'

async function prepareBuildSWPlugins(
  plugins: ServiceWorkerOptions['plugins'],
  asyncFlatten: typeof import('../bundler/utils')['asyncFlatten'],
): Promise<import('vite').PluginOption[]> {
  const pluginsFactoryResult = plugins ? plugins() : []
  const pluginsArray = Array.isArray(pluginsFactoryResult)
    ? pluginsFactoryResult
    : [pluginsFactoryResult]
  return plugins ? await asyncFlatten(pluginsArray) : []
}

function prepareViteBuilds<T extends SWType>(
  bundlerOptions: import('../bundler/bundler-types').BundlerOptions[],
  options: BuildServiceWorkerOptions<T>,
  prepareViteBuild: typeof import('./build-utils')['prepareViteBuild'],
  asyncFlatten: typeof import('../bundler/utils')['asyncFlatten'],
): Promise<any>[] {
  const { logLevel: ll, bundlerLogLevel } = options
  const logLevel = ll === 'silent'
    ? 'silent'
    : bundlerLogLevel!.vite!
  return bundlerOptions.map(async (b) => {
    return await prepareBuildSWPlugins(
      options.plugins,
      asyncFlatten,
    ).then((plugins) => {
      return prepareViteBuild(Object.assign(b, {
        logLevel,
        plugins,
        envDir: options.envDir,
        envPrefix: options.envPrefix,
        sourcemap: options.sourcemap,
        generateSW: false,
      }))
    })
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
    asyncFlatten,
    prepareViteBuild,
  ] = await Promise.all([
    import('../bundler/build-sw-bundler').then(({ internalBuildSW }) => internalBuildSW),
    import('./build-utils').then(({ prepareViteBuild }) => prepareViteBuild),
    import('../bundler/utils').then(({ asyncFlatten }) => asyncFlatten),
  ])
  return await internalBuildSW(
    'vite',
    now,
    options,
    bundlerOptions => prepareViteBuilds(
      bundlerOptions,
      options,
      asyncFlatten,
      prepareViteBuild,
    ),
  )
}
