import type { BundlerLogLevel } from '../../src/build/types'
import type { buildSW as viteBuildSW } from '../../src/build/vite/build-sw'
import type { buildSWLegacy } from '../../src/build/vite/legacy-build-sw'
import path from 'node:path'
import { normalizePath } from '../../src/build/builder/utils'

type BuildSWFunction = typeof viteBuildSW | typeof buildSWLegacy

export function createBuildSWPlugin(
  root: string,
  dist: string,
  buildSWFn: BuildSWFunction,
  bundlerLogLevel: BundlerLogLevel,
) {
  return {
    name: 'vite-pwa-test-plugin',
    async closeBundle() {
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
  }
}
