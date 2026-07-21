import type { Plugin } from 'vite'
import process from 'node:process'
import AdapterNode from '@sveltejs/adapter-node'
import AdpaterStatic from '@sveltejs/adapter-static'
import { DevTools } from '@vitejs/devtools'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'
import { withPwa } from './sveltekit-pwa-integration.ts'

export const staticAdapter = process.env.STATIC_ADAPTER === 'true'

export const adapter = staticAdapter ? AdpaterStatic() : AdapterNode()

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
  define: {
    __DATE__: `'${new Date().toISOString()}'`,
    __RELOAD_SW__: false,
  },
  build: {
    minify: false,
  },
  plugins: [
    DevTools(),
    withPwa(
      {
        compilerOptions: {
          // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
          runes: ({ filename }) =>
            filename.split(/[/\\]/).includes('node_modules') ? undefined : true,
        },

        experimental: {
          explicitEnvironmentVariables: true,
        },

        // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
        // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
        // See https://svelte.dev/docs/kit/adapters for more information about adapters.
        adapter,
      },
      {
        swType: 'classic-and-module',
        strategies: 'build-sw',
        // filename: './src/sw.ts',
        registerType: 'prompt',
        minify: false,
        // includeAssets: ['favicon.ico', 'favicon.svg'],
        // throwMaximumFileSizeToCacheInBytes: false,
        // maximumFileSizeToCacheInBytes: 6_000,
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
          globStrict: false,
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
          inspector: 'vite-devtools',
          suppressWarnings: true,
          navigateFallback: '/',
          navigateFallbackAllowlist: [/^\/$/],
        },
      },
    ),
    Inspect(),
  ],
})
