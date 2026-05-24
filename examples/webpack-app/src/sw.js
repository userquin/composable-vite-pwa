import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'

globalThis.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(globalThis.__WB_MANIFEST)
