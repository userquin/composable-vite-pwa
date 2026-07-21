import { withPwa } from '@composable-vite-pwa/vitepress'
import { DevTools } from '@vitejs/devtools'
import Inspect from 'vite-plugin-inspect'
import { defineConfig } from 'vitepress'

export default withPwa(defineConfig({
  title: 'unplugin-pwa-vitepress',
  description: 'unplugin-pwa-vitepress',
  themeConfig: {
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2022-PRESENT Anthony Fu',
    },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'About', link: '/about', activeMatch: '/about' },
    ],
  },
  vite: {
    plugins: [
      DevTools(),
      Inspect(),
    ],
  },
  pwa: {
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
    experimental: {
      includeAllowlist: true,
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
}))
