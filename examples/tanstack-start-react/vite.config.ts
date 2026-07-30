import { TanStackNitroPWAPlugin } from '@composable-vite-pwa/tanstack/vite/nitro'
import tailwindcss from '@tailwindcss/vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { DevTools as ViteDevTools } from '@vitejs/devtools'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  // base: '/app/',
  base: '/',
  build: {
    minify: false,
  },
  plugins: [
    ViteDevTools(),
    devtools(),
    nitro({
      baseURL: '/',
      // baseURL: '/app/',
      routeRules: {
        // looks like we need to add the baseURL, otherwise index.html being created later
        // and missing from the SW precache manifest, will check it with the new hook
        '/': { prerender: true },
        '/about': { prerender: true },
        // '/app/': { prerender: true },
        // '/app/about': { prerender: true },
      },
      // rollupConfig: {
      //   external: [/^@sentry\//],
      // },
    }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
      },
    }),
    viteReact(),
    {
      name: 'test',
      apply: 'build',
      enforce: 'post',
      applyToEnvironment(environment) {
        console.log('applyToEnvironment:', environment.name)
        return true
      },
      configEnvironment(name, config) {
        console.log('configEnvironment:', { name, consumer: config.consumer, x: config.build?.outDir })
      },
      configResolved(config) {
        console.log('configResolved:', config.build.outDir)
      },
    },
    /* {
      name: 'test2',
      apply: 'build',
      applyToEnvironment(environment) {
        console.log('applyToEnvironment:', environment.name)
        return environment.name === 'client'
      },
      closeBundle() {
        console.log('test2:closeBundle')
      },
    }, */
    TanStackNitroPWAPlugin({
      minify: false,
      disable: false,
      strategies: 'build-sw', // process.env.BUILD_SW ? 'build-sw' : 'generate-sw',
      swType: 'classic-and-module',
      registerType: 'autoUpdate',
      includeManifestIcons: false,
      base: '/',
      // base: '/app/',
      // scope: '/app/',
      generateSW: {
        navigateFallback: '/',
        // navigateFallback: '/app/',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
        sourcemap: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
      buildSW: {
        swSrc: 'src/plain-sw.ts',
        globPatterns: ['**/*.{css,js,html,svg,png,ico,txt,woff2}'],
        sourcemap: true,
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
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
        inspector: 'vite-devtools',
        navigateFallback: '/',
        navigateFallbackAllowlist: [/^\/$/],
        // navigateFallback: '/app/',
        // navigateFallbackAllowlist: [/^\/app\/$/],
      },
    }),
    Inspect(),
  ],
})

export default config
