import { defineCliOptions } from '@composable-vite-pwa/workbox-cli'
import { globIgnores } from './glogIgnores.ts'

// `get-manifest` cannot be authored with the build-only `defineOptions`, so the
// CLI ships `defineCliOptions`, widened to all four strategies.
export default defineCliOptions('get-manifest', {
  getManifest: {
    globDirectory: './',
    globIgnores,
    globPatterns: ['**/*.{js,html}'],
  },
})
