import { defineOptions } from '@composable-vite-pwa/workbox-build/config'
import { runtimeCaching } from './cache.ts'
import { globIgnores } from './globIgnores.ts'

export default defineOptions('generate-sw', {
  generateSW: {
    globDirectory: './',
    globIgnores,
    globPatterns: ['**/*.{js,html}'],
    skipWaiting: true,
    navigateFallback: 'index.html',
    cleanupOutdatedCaches: true,
    swDest: 'sw.js',
    runtimeCaching,
  },
})
