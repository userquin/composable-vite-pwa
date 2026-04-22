import { generateSW } from '@composable-vite-pwa/workbox-build/generate-sw'

generateSW({
  globDirectory: './',
  globPatterns: ['**/*.{js,html}'],
  skipWaiting: true,
  navigateFallback: 'index.html',
  cleanupOutdatedCaches: true,
  urlManipulation: ({ url }) => {
    return [url]
  },
  // inlineWorkboxRuntime: true,
  swDest: 'sw.js',
})
