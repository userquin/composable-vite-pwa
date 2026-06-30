/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'
import { message } from 'virtual:astro-sw-helper-message'
import { hello, sayHello } from './sw-helper'

console.log(message)
console.log(hello)
console.log(sayHello('from SW'))

// declare let self: ServiceWorkerGlobalScope

/** @type{undefined | RegExp[]} */
let allowlist
if (import.meta.env.DEV) {
  allowlist = [/^\/$/]
  // entries.push({ url: '/', revision: Math.random().toString() })
}

// self.__WB_MANIFEST is default injection point
precacheAndRoute(
  self.__WB_MANIFEST,
  {
    parallel: { enabled: true, concurrency: 5 },
    urlManipulation: ({ url }) => {
      /** @type{URL[]} */
      const urls = []
      if (url.pathname.endsWith('_payload.json')) {
        const newUrl = new URL(url.href)
        newUrl.search = ''
        urls.push(newUrl)
      }
      return urls
    },
  },
)

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
registerRoute(new NavigationRoute(
  createHandlerBoundToURL('/'),
  { allowlist },
))

self.skipWaiting()
clientsClaim()
