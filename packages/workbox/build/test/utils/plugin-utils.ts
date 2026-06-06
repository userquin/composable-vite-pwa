import type { Bundler, BundlerPluginType } from '../../src/build/builder/bundler-types'
import type { BundlerLogLevel } from '../../src/build/types'
import type { buildSW as viteBuildSW } from '../../src/build/vite/build-sw'
import type { buildSWLegacy } from '../../src/build/vite/legacy-build-sw'
import path from 'node:path'
import { normalizePath } from '../../src/build/builder/utils'

type BuildSWFunction = typeof viteBuildSW | typeof buildSWLegacy

export function createBuildSWPlugin<B extends Bundler>(
  root: string,
  dist: string,
  buildSWFn: BuildSWFunction,
  bundlerLogLevel: BundlerLogLevel,
): BundlerPluginType<B> {
  return {
    name: 'vite-pwa-test-plugin',
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler() {
        const swSrc = normalizePath(path.resolve(root, 'src/sw.js'))
        const swDest = normalizePath(path.resolve(dist, 'sw.js'))
        const globDirectory = normalizePath(dist)
        await buildSWFn({
          swSrc,
          swDest,
          globDirectory,
          globPatterns: ['**/*.js'],
          injectionPoint: 'self.__WB_MANIFEST',
          inlineWorkboxRuntime: true,
          sourcemap: false,
          mode: 'production',
          logLevel: 'silent',
          bundlerLogLevel,
        })
      },
    },
  } as BundlerPluginType<B>
}
