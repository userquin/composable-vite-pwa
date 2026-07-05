import { ReactRouterPWAPlugin } from '@composable-vite-pwa/react-router'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
    reactRouter(),
    ReactRouterPWAPlugin({
      minify: false,
      strategies: 'generate-sw',
      swType: 'classic-and-module',
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      generateSW: {
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
      },
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
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true,
        navigateFallback: '/',
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
