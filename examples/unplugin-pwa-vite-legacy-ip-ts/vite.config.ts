import type { PluginOption } from 'vite'
import { ViteLegacyPWA } from '@composable-vite-pwa/unplugin-pwa/node/vite/legacy'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

const swSrc = 'public/sw.js'
const swDest = 'sw.js'

export default defineConfig({
  build: {
    manifest: true,
    minify: false,
  },
  plugins: [
    // virtualMessagePlugin(),
    ViteLegacyPWA({
      swType: 'classic',
      filename: swDest,
      strategies: 'inject-manifest',
      // includeAssets: ['favicon.ico', 'favicon.svg'],
      includeManifestIcons: false,
      minify: false,
      manifest: {
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,html,css,ico,png}'],
        swSrc,
      },
      devOptions: {
        enabled: true,
        type: 'classic',
      },
    }) as PluginOption,
    Inspect(),
  ],
})
