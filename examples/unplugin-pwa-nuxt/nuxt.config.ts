// https://nuxt.com/docs/api/configuration/nuxt-config
// import { VirtualMessagePlugin } from './pwa.config'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@composable-vite-pwa/nuxt'],
  // experimental: {
  //   viteEnvironmentApi: true,
  // },
  // pwa: {
  //   path: '~~/pwa.config.ts',
  // },
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
