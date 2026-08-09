import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebpackPWA } from '@composable-vite-pwa/unplugin-pwa/webpack'

const root = path.dirname(fileURLToPath(import.meta.url))

export default {
  mode: 'production',
  context: root,
  entry: './src/index.js',
  output: { clean: true, filename: 'app.js', path: path.resolve(root, 'dist') },
  plugins: [WebpackPWA({
    strategies: 'generateSW',
    manifest: { name: 'Webpack PWA', short_name: 'Webpack' },
  })],
}
