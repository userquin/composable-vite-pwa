/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
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
