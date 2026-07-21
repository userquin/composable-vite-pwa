import process from 'node:process'
import { ReactRouterPWAPlugin } from '@composable-vite-pwa/react-router'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

const reactRouterPlugin = reactRouter()

export default defineConfig({
  build: {
    minify: false,
  },
  plugins: [
    DevTools(),
    tailwindcss(),
    reactRouterPlugin,
    ReactRouterPWAPlugin(
      reactRouterPlugin,
      {
        ssrRuntimeInfo: true,
        minify: false,
        strategies: process.env.BUILD_SW ? 'build-sw' : 'generate-sw',
        swType: 'classic-and-module',
        registerType: 'autoUpdate',
        includeManifestIcons: false,
        base: '/',
        generateSW: {
          globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
          sourcemap: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
        },
        buildSW: {
          swSrc: 'app/plain-sw.ts',
          globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
          sourcemap: true,
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
          inspector: 'vite-devtools',
          suppressWarnings: true,
          navigateFallback: '/',
          navigateFallbackAllowlist: [/^\/$/],
        },
      },
    ),
    Inspect(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
