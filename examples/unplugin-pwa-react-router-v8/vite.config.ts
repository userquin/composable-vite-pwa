import process from 'node:process'
import { ReactRouterPWAPlugin } from '@composable-vite-pwa/react-router'
import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// for testing purposes only
const usingRemixSW = process.env.PLAIN_SW !== 'true'
// for testing purposes only
const virtualPwaModule = process.env.VIRTUAL_PWA_MODULE !== 'false'

process.env.VITE_VIRTUAL_PWA_MODULE = virtualPwaModule.toString()
process.env.VITE_PUBLIC_VIRTUAL_PWA_MODULE = process.env.VITE_VIRTUAL_PWA_MODULE
process.env.VITE_BUILD_DATE = JSON.stringify(new Date().toISOString())

const reactRouterPlugin = reactRouter()

export default defineConfig({
  define: {
    VITE_VIRTUAL_PWA_MODULE: process.env.VITE_VIRTUAL_PWA_MODULE,
    VITE_PUBLIC_VIRTUAL_PWA_MODULE: process.env.VITE_VIRTUAL_PWA_MODULE,
    VITE_BUILD_DATE: process.env.VITE_BUILD_DATE,
  },
  plugins: [
    tailwindcss(),
    reactRouterPlugin,
    ReactRouterPWAPlugin(
      reactRouterPlugin,
      {
        minify: false,
        strategies: 'build-sw',
        swType: 'classic-and-module',
        registerType: 'autoUpdate',
        includeManifestIcons: false,
        injectRegister: usingRemixSW || virtualPwaModule ? false : 'auto',
        base: '/',
        generateSW: {
          globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
        },
        buildSW: {
          swSrc: usingRemixSW ? 'app/sw.ts' : 'app/plain-sw.ts',
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
          suppressWarnings: true,
          navigateFallback: '/',
          navigateFallbackAllowlist: [/^\/$/],
        },
      },
    ),
  ],
  resolve: {
    tsconfigPaths: true,
  },
})
