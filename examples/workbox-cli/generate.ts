// import { prepareSWCode } from '@composable-vite-pwa/workbox-build/utils/prepare-sw-code'

import { generateSW } from '@composable-vite-pwa/workbox-build/generate-sw'
import { runtimeCaching } from './cache'
import { globIgnores } from './glogIgnores'

/* prepareSWCode({
  globDirectory: './',
  globPatterns: ['**!/!*.{js,html}'],
  skipWaiting: true,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  disableDevLogs: false,
  sourcemap: true,
  swType: 'classic-and-module',
  inlineWorkboxRuntime: false,
  urlManipulation: ({ url }) => {
    return [url]
  },
  swDest: 'sw.js',
  runtimeCaching,
}).then((result) => {
  console.log(result)
}) */
/* generateSW({
  globDirectory: './',
  globPatterns: ['**!/!*.{js,html}'],
  skipWaiting: true,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  disableDevLogs: false,
  sourcemap: true,
  swType: 'module',
  urlManipulation: ({ url }) => {
    return [url]
  },
  swDest: 'sw.js',
  runtimeCaching,
}).then((result) => {
  console.log(result)
}) */
// generateSW({
//   globDirectory: './',
//   globPatterns: ['**/*.{js,html}'],
//   skipWaiting: true,
//   navigateFallback: 'index.html',
//   cleanupOutdatedCaches: true,
//   disableDevLogs: false,
//   sourcemap: true,
//   swType: 'classic',
//   urlManipulation: ({ url }) => {
//     return [url]
//   },
//   swDest: 'sw.js',
//   runtimeCaching,
// }).then(result => {
//   console.log(result)
// })
generateSW({
  globDirectory: './',
  globIgnores,
  globPatterns: ['**/*.{js,html}'],
  skipWaiting: true,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  disableDevLogs: false,
  sourcemap: true,
  swType: 'classic-and-module',
  urlManipulation: () => {
    return []
  },
  swDest: 'sw.js',
  inlineWorkboxRuntime: true,
  runtimeCaching,
}).then((result) => {
  // eslint-disable-next-line no-console
  console.log(result)
})
