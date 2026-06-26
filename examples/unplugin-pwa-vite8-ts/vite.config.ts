import type { Plugin } from 'vite'
import { VitePWA } from '@composable-vite-pwa/unplugin-pwa'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

const swSrc = 'src/sw.ts'
const swDest = 'sw.js'

function virtualMessagePlugin(): Plugin {
  const virtual = 'virtual:message'
  const resolvedVirtual = `\0${virtual}`
  return {
    name: 'vite-plugin-test',
    resolveId(id) {
      return id === virtual ? resolvedVirtual : null
    },
    load(id) {
      if (id === resolvedVirtual)
        return `export const message = 'Message from Virtual Module Plugin'`
    },
  } satisfies Plugin
}

export default defineConfig({
  devtools: {
    enabled: true,
  },
  build: {
    manifest: true,
    minify: false,
  },
  plugins: [
    virtualMessagePlugin(),
    VitePWA({
      swType: 'classic-and-module',
      strategies: 'build-sw',
      includeAssets: ['favicon.ico', 'favicon.svg'],
      // includeManifestIcons: true,
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
      buildSW: {
        sourcemap: true,
        manifest: true,
        swSrc,
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
        plugins: () => [virtualMessagePlugin()],
      },
      generateSW: {
        sourcemap: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
    Inspect({
      dev: true,
      build: false,
    }),
  ],
})
