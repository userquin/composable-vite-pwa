import { clientsClaim, skipWaiting } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'

declare let self: ServiceWorkerGlobalScope

// Precache manifest will be injected
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
skipWaiting()
clientsClaim()
