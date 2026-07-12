importScripts('./chunk.js', 'https://storage.googleapis.com/workbox-cdn/releases/6.4.1/workbox-sw.js')

workbox.setConfig({
  modulePathPrefix: '/third_party/workbox-vX.Y.Z/',
})
