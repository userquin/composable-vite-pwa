import { generateSW } from '@composable-vite-pwa/workbox-build/generate-sw'
import { runtimeCaching } from './cache'

generateSW({
  globDirectory: './',
  globPatterns: ['**/*.{js,html}'],
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
})
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
/* generateSW({
  globDirectory: './',
  globPatterns: ['**!/!*.{js,html}'],
  skipWaiting: true,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  disableDevLogs: false,
  sourcemap: true,
  swType: 'classic-and-module',
  urlManipulation: ({ url }) => {
    return [url]
  },
  swDest: 'sw.js',
  runtimeCaching,
}).then(({ classic, module }) => {
  console.log('CLASSIC:')
  console.log(classic)
  console.log('MODULE:')
  console.log(module)
}) */
