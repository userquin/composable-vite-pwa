/* eslint-disable no-console */
import {
  CacheFirst,
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  NavigationRoute,
  NetworkFirst,
  precacheAndRoute,
  registerRoute,
  StaleWhileRevalidate,
} from '@composable-vite-pwa/workbox-swkit'
import { message2, sayHello2 } from 'virtual:sw-chunk'
import { runA } from './a'
import { runC } from './c'
import { circularDepMessage1, func1 } from './circular-dep-1.js'
import { circularDepMessage2, func2 } from './circular-dep-2.js'
import { message, sayHello } from './sw-chunk'

console.log('Message from local sw-chunk', message)
console.log('sayHello', sayHello('userquin'))
console.log('Message from virtual:sw-chunk', message2)
console.log('sayHello2', sayHello2('userquin'))

runA()
runC()

console.log(import.meta.env)

console.log(circularDepMessage1, typeof func1)
console.log(circularDepMessage2, typeof func2)

// eslint-disable-next-line no-restricted-globals
self.skipWaiting()
// eslint-disable-next-line no-restricted-globals
precacheAndRoute(self.__WB_MANIFEST, {
  cleanURLs: true,
  urlManipulation: () => {
    return []
  },
})
cleanupOutdatedCaches()
/** @type {RegExp[] | undefined} */
let allowlist
if (import.meta.env.DEV)
  allowlist = [/^\/$/]

registerRoute(new NavigationRoute(
  createHandlerBoundToURL('index.html'),
  { allowlist },
))
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('^https:\\/\\/fonts\\.(?:googleapis|gstatic)\\.com\\/.*', 'i'), new CacheFirst({
  cacheName: 'google-fonts',
  expiration: {
    maxEntries: 4,
    maxAgeSeconds: 31536e3,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$', 'i'), new StaleWhileRevalidate({
  cacheName: 'static-font-assets',
  expiration: {
    maxEntries: 4,
    maxAgeSeconds: 604800,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\.(?:jpg|jpeg|gif|png|svg|ico|webp)$', 'i'), new StaleWhileRevalidate({
  cacheName: 'static-image-assets',
  expiration: {
    maxEntries: 64,
    maxAgeSeconds: 86400,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\.js$', 'i'), new StaleWhileRevalidate({
  cacheName: 'static-js-assets',
  expiration: {
    maxEntries: 32,
    maxAgeSeconds: 86400,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\.(?:css|less)$', 'i'), new StaleWhileRevalidate({
  cacheName: 'static-style-assets',
  expiration: {
    maxEntries: 32,
    maxAgeSeconds: 86400,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\.(?:json|xml|csv)$', 'i'), new NetworkFirst({
  cacheName: 'static-data-assets',
  expiration: {
    maxEntries: 32,
    maxAgeSeconds: 86400,
  },
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('\\/api\\/.*$', 'i'), new NetworkFirst({
  cacheName: 'apis',
  expiration: {
    maxEntries: 16,
    maxAgeSeconds: 86400,
  },
  networkTimeoutSeconds: 10,
}), 'GET')
// eslint-disable-next-line prefer-regex-literals
registerRoute(new RegExp('.*', ''), new NetworkFirst({
  cacheName: 'others',
  expiration: {
    maxEntries: 32,
    maxAgeSeconds: 86400,
  },
  networkTimeoutSeconds: 10,
}), 'GET')
