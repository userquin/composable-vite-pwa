import fs from 'node:fs/promises'
import path from 'node:path'
import { build as viteBuild } from 'vite'
import { it as base, describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { buildSW as viteBuildSW } from '../src/build/vite/build-sw'
import { buildSWLegacy } from '../src/build/vite/legacy-build-sw'
import { createBuildSWPlugin, createFixture } from './utils/vite-utils'

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

export const testVite = base
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
