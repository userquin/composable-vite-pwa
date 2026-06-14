/* eslint-disable no-restricted-globals */
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
