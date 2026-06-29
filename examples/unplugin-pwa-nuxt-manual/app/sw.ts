import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'
import { message } from 'virtual:nuxt-sw-helper-message'
import manifest from '#app-manifest'
import { hello2, sayHello2 } from '~/sw/sw-helper'
import { hello, sayHello } from './sw-helper'

console.log(message)
console.log(hello)
console.log(hello2)
console.log(sayHello('from SW'))
console.log(sayHello2('from SW'))
console.log('Nuxt manifest', manifest)

declare let self: ServiceWorkerGlobalScope

let allowlist: undefined | RegExp[]
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
      const urls: URL[] = []
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
