import type { Plugin } from 'vite'
import { VitePWA } from '@composable-vite-pwa/unplugin-pwa'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { DevTools } from '@vitejs/devtools'
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
  // plugins: [
  //
  // ],
  build: {
    manifest: true,
    minify: false,
    // rolldownOptions: {
    //   devtools: {}, // enable devtools mode
    // },
  },
  plugins: [
    DevTools(/* {
      builtinDevTools: true,
    } */),
    // virtualMessagePlugin(),
    VitePWA({
      // disable: true,
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
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
        plugins: (swType) => {
          // if (swType === 'classic') {
          //   return [virtualMessagePlugin()]
          // }

          return [
            virtualMessagePlugin(),
            sentryVitePlugin({
              org: 'dummy-org',
              project: 'dummy-project',
              authToken: 'dummy-token',
              telemetry: false,
              release: { name: 'repro-release' },
              // Prevent it from trying to upload anything (that would require real authentication)
              sourcemaps: { disable: true },
            }),
          ]
        },
      },
      generateSW: {
        sourcemap: true,
      },
      devOptions: {
        enabled: true,
        inspector: 'vite-devtools',
        type: 'module',
      },
    }),
    Inspect(/* {
      dev: true,
      build: false,
    } */),
  ],
})
