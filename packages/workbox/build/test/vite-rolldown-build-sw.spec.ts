import type { BundlerLogLevel } from '../src/build/types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { rolldown } from 'rolldown'
import { build as viteBuild } from 'vite'
import { it as base, describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { buildSW as rolldownBuildSW } from '../src/build/rolldown/build-sw'
import { buildSW as viteBuildSW } from '../src/build/vite/build-sw'
import { buildSWLegacy } from '../src/build/vite/legacy-build-sw'

const isWatchMode = process.env.VITEST_MODE === 'WATCH'

const swCode = `self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', () => {
  console.log('SW activated');
});
self.addEventListener('fetch', (event) => {
  console.log('Fetch:', event.request.url);
});
`

type BuildSWFunction = typeof viteBuildSW | typeof buildSWLegacy

function createBuildSWPlugin(
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

async function createFixture(
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

export const testVite = base
  .extend<{ sandbox: { root: string, dist: string } }>({
    // eslint-disable-next-line no-empty-pattern
    sandbox: async ({}, use) => {
      await createFixture(swCode, use)
    },
  })
  .skipIf(isWatchMode)

export const testRolldown = base
  .extend<{ sandbox: { root: string, dist: string } }>({
    // eslint-disable-next-line no-empty-pattern
    sandbox: async ({}, use) => {
      await createFixture(swCode, use)
    },
  })
  .skipIf(isWatchMode)

describe('buildSW with Vite (modern)', () => {
  testVite(
    'generates a service worker using a plugin with closeBundle (Vite 8+)',
    async ({ sandbox }) => {
      const { root, dist } = sandbox

      const swPlugin = createBuildSWPlugin(root, dist, viteBuildSW, { vite: 'silent' })
      await viteBuild({
        root,
        build: {
          outDir: dist,
          rolldownOptions: { input: path.resolve(root, 'src/index.js') },
        },
        plugins: [swPlugin],
        logLevel: 'silent',
      })

      const swDest = normalizePath(path.resolve(dist, 'sw.js'))
      const swFilePromise = fs.readFile(swDest, 'utf8')
      await expect(swFilePromise).resolves.not.toThrow()
      const swContent = await swFilePromise
      expect(swContent).toContain('self.addEventListener')
      expect(swContent.length).toBeGreaterThan(0)
    },
  )
})

describe('generates a service worker using legacy buildSW (Vite <8)', () => {
  testVite('generates a service worker using legacy buildSW (Vite <8 via Rolldown)', async ({ sandbox }) => {
    const { root, dist } = sandbox
    const swPlugin = createBuildSWPlugin(root, dist, buildSWLegacy, { rolldown: 'silent' })
    await viteBuild({
      root,
      build: { outDir: dist, rolldownOptions: { input: path.resolve(root, 'src/index.js') } },
      plugins: [swPlugin],
      logLevel: 'silent',
    })
    const swDest = normalizePath(path.resolve(dist, 'sw.js'))
    const swFilePromise = fs.readFile(swDest, 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('self.addEventListener')
    expect(swContent.length).toBeGreaterThan(0)
  })
})

describe('buildSW with Rolldown (direct)', () => {
  testRolldown('generates a service worker directly', async ({ sandbox }) => {
    const { root, dist } = sandbox
    const rolldownBuild = await rolldown({
      input: path.resolve(root, 'src/index.js'),
    })
    await rolldownBuild.write({ dir: dist })
    const swSrc = normalizePath(path.resolve(root, 'src/sw.js'))
    const swDest = normalizePath(path.resolve(dist, 'sw.js'))
    const globDirectory = normalizePath(dist)
    await rolldownBuildSW({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      inlineWorkboxRuntime: true,
      sourcemap: false,
      mode: 'production',
      logLevel: 'silent',
      bundlerLogLevel: { rolldown: 'silent' },
    })
    const swFilePromise = fs.readFile(swDest, 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('self.addEventListener')
    expect(swContent.length).toBeGreaterThan(0)
  })
})
