/* eslint-disable no-var,vars-on-top,no-restricted-globals,no-console */
// eslint-disable-next-line no-undef
importScripts(
  'https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js',
  './sw-helper.js',
)

var { clientsClaim } = self.workbox.core
var { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } = self.workbox.precaching
var { NavigationRoute, registerRoute } = self.workbox.routing

var { sayHello, hello } = self.workbox.swHelperClassic

console.log(hello)
console.log(sayHello('from SW'))

precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
self.skipWaiting()
clientsClaim()
