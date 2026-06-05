import type { BundlerLogLevel } from '../../src/build/types'
import type { buildSW as viteBuildSW } from '../../src/build/vite/build-sw'
import type { buildSWLegacy } from '../../src/build/vite/legacy-build-sw'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
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
    closeBundle: {
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
  }
}

export async function createFixture(
  swCode: string,
  use: (paths: { root: string, dist: string }) => Promise<void>,
) {
  let root: string | undefined
  try {
    root = await fs.mkdtemp(
      path.resolve(process.cwd(), 'test', 'temp-fixtures', 'vite-pwa-'),
    )
    const src = path.resolve(root, 'src')
    const dist = path.resolve(root, 'dist')
    await fs.mkdir(src, { recursive: true })
    await Promise.all([
      fs.writeFile(path.resolve(src, 'index.js'), 'console.log("PWA test");\n'),
      fs.writeFile(path.resolve(src, 'sw.js'), swCode, 'utf-8'),
      fs.writeFile(path.resolve(root, 'package.json'), '{}'),
    ])
    await use({ root, dist })
  }
  finally {
    if (root) {
      await fs
        .rm(root, {
          recursive: true,
          force: true,
          maxRetries: 3,
          retryDelay: 100,
        })
        .catch(err =>
          console.error(`Failed to cleanup sandbox at ${root}:`, err),
        )
    }
  }
}
