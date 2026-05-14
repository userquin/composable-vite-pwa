import { defineConfig } from 'vite'
// import { PWAPlugin } from './pwa-plugin'
import { PWAPlugin2 } from './pwa-plugin-2'
import { VirtualPlugin } from './virtual-plugin'

export default defineConfig({
  mode: 'development',
  build: {
    minify: false,
  },
  plugins: [
    VirtualPlugin(),
    PWAPlugin2(
      'sw.js',
      'classic-and-module',
      'legacy-build-sw',
      ['VITE_', 'PUBLIC_'],
    ),
  ],
})
