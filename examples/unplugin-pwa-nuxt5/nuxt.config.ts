import { createResolver } from '@nuxt/kit'

const resolver = createResolver(import.meta.url)

const r = (path: string) => resolver.resolve(path)

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@composable-vite-pwa/nuxt'],
  alias: {
    '@composable-vite-pwa/nuxt': r(`../../packages/nuxt/dist/module.mjs`),
  },
  // experimental: {
  //   viteEnvironmentApi: true,
  // },
  pwa: {
    path: '~~/pwa.config.ts',
  },
  routeRules: {
    // offline support
    '/': { prerender: true },
  },
  // app: {
  //   baseURL: '/pepe/',
  // },
  vite: {
    $client: {
      build: {
        minify: false,
      },
    },
    // plugins: [VirtualMessagePlugin()],
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
})
