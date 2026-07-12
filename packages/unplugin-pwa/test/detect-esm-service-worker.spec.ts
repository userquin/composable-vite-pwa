import type { VitePWAOptions } from '../src/node/types'
import { describe, expect, it } from 'vitest'
import { detectEsmServiceWorker } from '../src/node/detect-esm-service-worker'

describe('detect esm service worker works as expected', () => {
  it('detects esm syntax', async () => {
    const pwaOptions: Partial<VitePWAOptions<'inject-manifest', 'classic'>> = {
      strategies: 'inject-manifest',
      filename: 'test/fixtures/detect-esm-service-worker/sw.js',
      injectManifest: {
        swSrc: 'test/fixtures/detect-esm-service-worker/esm-sw.js',
      },
    }

    await expect(detectEsmServiceWorker(pwaOptions)).resolves.toBe(true)
  })
  it('detects esm syntax with TS', async () => {
    const pwaOptions: Partial<VitePWAOptions<'inject-manifest', 'classic'>> = {
      strategies: 'inject-manifest',
      filename: 'test/fixtures/detect-esm-service-worker/sw.js',
      injectManifest: {
        swSrc: 'test/fixtures/detect-esm-service-worker/esm-sw-ts.ts',
      },
    }

    await expect(detectEsmServiceWorker(pwaOptions)).resolves.toBe(true)
  })
  it('detects no esm syntax', async () => {
    const pwaOptions: Partial<VitePWAOptions<'inject-manifest', 'classic'>> = {
      strategies: 'inject-manifest',
      filename: 'test/fixtures/detect-esm-service-worker/sw.js',
      injectManifest: {
        swSrc: 'test/fixtures/detect-esm-service-worker/no-esm-imports-sw.js',
      },
    }

    await expect(detectEsmServiceWorker(pwaOptions)).resolves.toBe(false)
  })
  it('detects no esm syntax with importScripts', async () => {
    const pwaOptions: Partial<VitePWAOptions<'inject-manifest', 'classic'>> = {
      strategies: 'inject-manifest',
      filename: 'test/fixtures/detect-esm-service-worker/sw.js',
      injectManifest: {
        swSrc: 'test/fixtures/detect-esm-service-worker/import-scripts-sw.js',
      },
    }

    await expect(detectEsmServiceWorker(pwaOptions)).resolves.toBe(false)
  })
})
