// import path from 'node:path'
// import { createResolver } from '@nuxt/kit'
//
// const resolver = createResolver(import.meta.url)
// const nuxtModule = resolver.resolve('.nuxt')
//
// const r = (p: string) => path.relative(nuxtModule, resolver.resolve(p))

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@composable-vite-pwa/nuxt'],
  future: {
    typescriptBundlerResolution: true,
    compatibilityVersion: 4,
  },
  alias: {
    '@composable-vite-pwa/nuxt': `../../packages/nuxt/dist/module.mjs`,
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
  ssr: false,
  nitro: {
    static: true,
    preset: 'netlify-static',
  },
  // app: {
  //   baseURL: '/pepe/',
  // },
  vite: {
    server: {
      fs: {
        allow: ['../..'],
      },
    },
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
