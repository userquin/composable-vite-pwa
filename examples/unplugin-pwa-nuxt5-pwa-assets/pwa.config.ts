import type { PwaModuleOptions } from '@composable-vite-pwa/nuxt'
import type { Plugin } from 'vite'

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
  }
}

export const config: PwaModuleOptions<'build-sw', 'classic-and-module'> = {
  swType: 'classic-and-module',
  strategies: 'build-sw',
  // includeAssets: ['favicon.ico', 'favicon.svg'],
  // includeManifestIcons: true,
  minify: false,
  disable: false,
  // includeManifest: false,
  registerWebManifestInRouteRules: true,
  client: {
    registerPlugin: true,
  },
  pwaAssets: {
    config: '~~/pwa-assets.config.ts',
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
    shortcuts: [
      {
        name: 'Home',
        url: '/home',
        icons: [
          {
            src: 'shortcuts/home-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'shortcuts/home.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Local',
        url: '/?local-pwa-shortcut=true',
        icons: [
          {
            src: 'shortcuts/local-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'shortcuts/local.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Notifications',
        url: '/?notifications-pwa-shortcut=true',
        icons: [
          {
            src: 'shortcuts/notifications-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'shortcuts/notifications.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Compose',
        url: '/compose',
        icons: [
          {
            src: 'shortcuts/compose-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'shortcuts/compose.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
      {
        name: 'Settings',
        url: '/settings',
        icons: [
          {
            src: 'shortcuts/settings-96x96.png',
            sizes: '96x96',
            type: 'image/png',
          },
          {
            src: 'shortcuts/settings.png',
            sizes: '192x192',
            type: 'image/png',
          },
        ],
      },
    ],
    screenshots: [
      {
        src: 'screenshots/dark-1.webp',
        sizes: '3840x2400',
        type: 'image/webp',
        form_factor: 'wide',
        label: 'Screenshot of Elk running on desktop in dark mode ',
      },
      {
        src: 'screenshots/light-1.webp',
        sizes: '3840x2400',
        type: 'image/webp',
        form_factor: 'wide',
        label: 'Screenshot of Elk running on desktop in light mode',
      },
      {
        src: 'screenshots/dark-2.webp',
        sizes: '1080x2400',
        type: 'image/webp',
        form_factor: 'narrow',
        label: 'Screenshot of Elk running on mobile in dark mode',
      },
      {
        src: 'screenshots/light-2.webp',
        sizes: '1080x2400',
        type: 'image/webp',
        form_factor: 'narrow',
        label: 'Screenshot of Elk running on mobile in light mode',
      },
    ],
  },
  buildSW: {
    sourcemap: true,
    manifest: true,
    swSrc,
    globPatterns: ['**/*.{html,png,js,css,webp,webmanifest,svg,ico}'],
    customChunks: (moduleId, ctx) => {
      if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
        return 'sw-helper'
      }
    },
    plugins: () => [VirtualMessagePlugin()],
  },
  generateSW: {
    sourcemap: true,
    globPatterns: ['**/*.{html,png,js,css,webp,webmanifest,svg,ico}'],
  },
  devOptions: {
    enabled: true,
    type: 'module',
    inspector: 'vite-devtools',
    suppressWarnings: true,
    navigateFallback: '/',
    navigateFallbackAllowlist: [/^\/$/],
  },
}
