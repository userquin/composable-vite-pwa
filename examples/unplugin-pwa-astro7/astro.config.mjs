// @ts-check
import { AstroPWAIntegration } from '@composable-vite-pwa/astro'
import { defineConfig } from 'astro/config'

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
  integrations: [
    AstroPWAIntegration({
      swType: 'classic-and-module',
      strategies: 'build-sw',
      // includeAssets: ['favicon.ico', 'favicon.svg'],
      // includeManifestIcons: true,
      minify: false,
      disable: false,
      includeManifest: false,
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
        suppressWarnings: true,
        navigateFallback: '/',
        navigateFallbackAllowlist: [/^\/$/],
      },
    }),
  ],
})
