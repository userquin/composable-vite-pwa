import fs from 'node:fs/promises'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { it as base, describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { buildSW as rolldownBuildSW } from '../src/build/rolldown/build-sw'
import { createFixture } from './utils/vite-utils'

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

export const testRolldown = base
  .extend<{ sandbox: { root: string, dist: string } }>({
    // eslint-disable-next-line no-empty-pattern
    sandbox: async ({}, use) => {
      await createFixture(swCode, use)
    },
  })
  .skipIf(isWatchMode)

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
