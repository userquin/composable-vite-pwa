import { parseModule } from 'magicast'
import { describe, expect, it } from 'vitest'
import { parseServiceWorkerCode } from '../src/utils/parse-esm-sw'

describe('parse-esm-service-worker', () => {
  it('js service worker', () => {
    const sw = parseModule(`
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'

precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('index.html'),
))

self.skipWaiting()
clientsClaim()
  `)

    expect(sw.imports).toBeDefined()
    expect(sw.imports.$items).toBeDefined()
    expect(sw.imports.$items.length).toBeGreaterThan(1)
    console.log(sw.imports.$items.length)
    console.log(sw.imports.$items.map(n => [n.from, n.imported] as const))
    // expect(extractWorkboxRuntimeImports(sw)).toMatchInlineSnapshot()
  })

  it.only('ts service worker', async () => {
    await expect(parseServiceWorkerCode('workbox', true, `
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import type { urlManipulation } from '@composable-vite-pwa/workbox-swkit/precaching'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'

const manipulate: urlManipulation = ({ url }) => []

precacheAndRoute(self.__WB_MANIFEST, {
  urlManipulation:  manipulate
})

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('index.html'),
))

self.skipWaiting()
clientsClaim()
`)).resolves.toMatchInlineSnapshot(`
  {
    "barrel": false,
    "rewrite": true,
    "swCode": "importScripts("./workbox");
  const manipulate                  = ({ url }) => []

  precacheAndRoute(self.__WB_MANIFEST, {
    urlManipulation:  manipulate
  })

  // clean old assets
  cleanupOutdatedCaches()

  // to allow work offline
  registerRoute(new NavigationRoute(
      createHandlerBoundToURL('index.html'),
  ))

  self.skipWaiting()
  clientsClaim()   
  ",
    "workbox": "import * as core from "@composable-vite-pwa/workbox-swkit/core";
  import * as precaching from "@composable-vite-pwa/workbox-swkit/precaching";
  import * as routing from "@composable-vite-pwa/workbox-swkit/routing";
  self.workbox=self.workbox||{};
  self.workbox.core=core;
  self.workbox.precaching=precaching;
  self.workbox.routing=routing;
  ",
  }
`)
  })
})
