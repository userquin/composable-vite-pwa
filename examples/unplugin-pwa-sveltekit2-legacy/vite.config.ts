import type { PluginOption, UserConfig } from 'vite'
import process from 'node:process'
import { LegacySvelteKitPWA } from '@composable-vite-pwa/sveltekit/legacy'
import { sveltekit } from '@sveltejs/kit/vite'
import Inspect from 'vite-plugin-inspect'

// you don't need to do this if you're using generateSW strategy in your app
import { generateSW } from './pwa.mjs'

const swSrc = 'src/prompt-sw.ts'

const config: UserConfig = {
  // WARN: this will not be necessary on your project
  logLevel: 'info',
  // WARN: this will not be necessary on your project
  build: {
    minify: false,
  },
  // WARN: this will not be necessary on your project
  define: {
    '__DATE__': `'${new Date().toISOString()}'`,
    '__RELOAD_SW__': false,
    'process.env.NODE_ENV': process.env.NODE_ENV === 'production' ? '"production"' : '"development"',
  },
  // WARN: this will not be necessary on your project
  server: {
    fs: {
      // Allow serving files from hoisted root node_modules
      allow: ['../..'],
    },
  },
  plugins: [
    sveltekit() as PluginOption,
    LegacySvelteKitPWA({
      swType: 'classic-and-module',
      // you don't need to do this if you're using generateSW strategy in your app
      strategies: generateSW ? 'generate-sw' : 'build-sw',
      // you don't need to do this if you're using generateSW strategy in your app
      // filename: generateSW ? undefined : 'prompt-sw.ts',
      scope: '/',
      base: '/',
      // selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
      manifest: {
        short_name: 'SvelteKit PWA',
        name: 'SvelteKit PWA',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      buildSW: {
        swSrc,
        sourcemap: true,
        manifest: true,
        globStrict: false,
        // inlineWorkboxRuntime: true,
        // globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
      },
      generateSW: {
        sourcemap: true,
        // globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2}'],
      },
      devOptions: {
        enabled: true,
        inspector: 'standalone',
        suppressWarnings: true,
        type: 'module',
        navigateFallback: '/',
      },
      // if you have shared info in svelte config file put in a separate module and use it also here
      kit: {
        includeVersionFile: true,
      },
    }) as PluginOption,
    Inspect(),
  ],
}

export default config
