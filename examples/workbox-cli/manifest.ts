import { getManifest } from '@composable-vite-pwa/workbox-build'
import { globIgnores } from './glogIgnores'

getManifest({
  globDirectory: './',
  globIgnores,
  globPatterns: ['**/*.{js,html}'],
// eslint-disable-next-line no-console
}).then(console.log)
