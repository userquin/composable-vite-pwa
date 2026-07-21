// @ts-check
import { AstroPWAIntegration } from '@composable-vite-pwa/astro'
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'astro/config'
import Inspect from 'vite-plugin-inspect'

const swSrc = 'src/sw.js'
const swDest = 'sw.js'

export function VirtualMessagePlugin() {
  const virtual = 'virtual:astro-sw-helper-message'
  const resolvedVirtual = `\0${virtual}`
  /** @type {import('vite').Plugin} */
  const plugin = {
    name: 'vite-plugin-test',
    resolveId(id) {
      return id === virtual ? resolvedVirtual : null
    },
    load(id) {
      if (id === resolvedVirtual)
        return `export const message = 'Message from Virtual Module Plugin'`
    },
  }

  return plugin
}

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      DevTools(),
      Inspect(),
    ],
    build: {
      minify: false,
    },
  },
  integrations: [
    AstroPWAIntegration({
      swType: 'classic-and-module',
      strategies: 'build-sw',
      injectRegister: false,
      // includeAssets: ['favicon.ico', 'favicon.svg'],
      // includeManifestIcons: true,
      minify: false,
      disable: false,
      includeManifest: true,
      includeManifestIcons: false,
      includeManifestShortcutIcons: false,
      includeManifestScreenshots: false,
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
      buildSW: {
        sourcemap: true,
        manifest: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,ico}'],
        swSrc,
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
        plugins: () => [VirtualMessagePlugin()],
      },
      generateSW: {
        sourcemap: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
        inspector: 'vite-devtools',
        suppressWarnings: true,
        navigateFallback: '/',
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
})
