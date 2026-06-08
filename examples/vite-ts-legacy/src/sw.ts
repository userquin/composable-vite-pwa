/// <reference lib="webworker" />
import type { PrecacheEntry } from '@composable-vite-pwa/workbox-swkit/precaching'
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'
import { message } from 'virtual:message'
import { hello, sayHello } from './sw-helper.ts'

declare global {
  interface Window {
    __WB_MANIFEST: Array<PrecacheEntry | string>
    skipWaiting: () => Promise<void>
  }
}

console.log(message)
console.log(hello)
console.log(sayHello('from SW'))

// self.__WB_MANIFEST is default injection point
precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

let allowlist: undefined | RegExp[]
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('index.html'),
  { allowlist },
))

self.skipWaiting()
clientsClaim()
