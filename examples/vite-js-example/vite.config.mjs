import { defineConfig } from 'vite'
import { PWAPlugin } from './pwa-plugin'
import { VirtualPlugin } from './virtual-plugin'

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [VirtualPlugin(), PWAPlugin('sw.js')],
})
