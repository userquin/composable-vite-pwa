import { defineCliOptions } from '@composable-vite-pwa/workbox-cli'
import { runtimeCaching } from './cache.ts'
import { globIgnores } from './glogIgnores.ts'

// `get-manifest` cannot be authored with the build-only `defineOptions`, so the
// CLI ships `defineCliOptions`, widened to all four strategies.
export default defineCliOptions('get-manifest', {
  buildSW: {
    swSrc: 'custom-sw.js',
    swDest: 'custom-build/sw-cli-generated.js',
    globDirectory: './custom-build',
    globPatterns: ['**/*.{js,html}'],
  },
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
  getManifest: {
    globDirectory: './',
    globIgnores,
    globPatterns: ['**/*.{js,html}'],
  },
  injectManifest: {
    swSrc: 'custom-sw.js',
    swDest: 'custom-build/sw-cli-generated.js',
    injectionPoint: 'self.__WB_MANIFEST',
    globDirectory: './custom-build',
    globPatterns: ['**/*.{js,html}'],
  },

})
