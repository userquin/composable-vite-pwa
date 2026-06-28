import type { Plugin } from 'vite'
import type { PwaModuleOptions } from './modules/pwa'

const swSrc = '~/sw.ts'
const swDest = 'sw.js'

export function VirtualMessagePlugin(): Plugin {
  const virtual = 'virtual:nuxt-sw-helper-message'
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

export const config: PwaModuleOptions<'build-sw', 'classic-and-module'> = {
  swType: 'classic-and-module',
  strategies: 'build-sw',
  includeAssets: ['favicon.ico', 'favicon.svg'],
  // includeManifestIcons: true,
  minify: false,
  disable: false,
  includeManifest: false,
  client: {
    registerPlugin: false,
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
}
