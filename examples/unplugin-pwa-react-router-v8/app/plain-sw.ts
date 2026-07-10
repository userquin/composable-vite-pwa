/// <reference types="vite/client" />
/// <reference lib="webworker" />

import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'
import { navigateFallback, ssr } from 'virtual:vite-pwa/react-router/sw'
import { setupRoutes } from './shared-sw'

console.log(ssr, navigateFallback)

declare let self: ServiceWorkerGlobalScope

const url = import.meta.env.DEV ? '/' : (navigateFallback ?? '/index.html')

/// self.__WB_MANIFEST is the default injection point
const manifest = self.__WB_MANIFEST
if (import.meta.env.DEV) {
  const entry = manifest.findIndex(entry => typeof entry !== 'string' && entry.url === url)
  if (entry !== -1)
    manifest.splice(entry, 1)

  // add the navigateFallback to the manifest
  manifest.push({ url, revision: Math.random().toString() })
}

precacheAndRoute(manifest)

// clean old assets
cleanupOutdatedCaches()

let allowlist: RegExp[] | undefined
// in dev mode, we disable precaching to avoid caching issues
if (import.meta.env.DEV) {
  if (ssr) {
    // add the navigateFallback to the manifest
    allowlist = [new RegExp(`^${url}$`)]
  }
  else {
    allowlist = [/^index.html$/]
  }
}

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL(navigateFallback || '/'),
  { allowlist },
))

setupRoutes()

self.skipWaiting()
clientsClaim()
