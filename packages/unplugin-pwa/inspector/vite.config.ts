import { INSPECTOR_BASE_PATH_URL } from '@composable-vite-pwa/unplugin-pwa/node/constants'
import presetIcons from '@unocss/preset-icons'
import presetUno from '@unocss/preset-wind3'
import { DevTools } from '@vitejs/devtools'
import Vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import { defineConfig } from 'vite'
import VueRouter from 'vue-router/vite'

export default defineConfig({
  base: INSPECTOR_BASE_PATH_URL,
  define: {
    // disable options api in production build
    __VUE_OPTIONS_API__: 'false',
    // disable hydration mismatch details in production build
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
  },
  build: {
    target: 'esnext',
    minify: false,
    emptyOutDir: true,
    outDir: '../dist/inspector',
    rolldownOptions: {
      devtools: {},
    },
  },
  plugins: [
    DevTools(/* {
      build: {
        withApp: true,
        outDir: '../dist/inspector',
      },
    } */),
    VueRouter({
      root: 'inspector',
      routesFolder: 'src/pages',
    }),
    Vue({
      features: {
        optionsAPI: false,
      },
    }),
    UnoCSS({
      theme: {
        fontFamily: {
          sans: '\'Inter\', sans-serif',
          mono: '\'Fira Code\', monospace',
        },
      },
      presets: [presetIcons(), presetUno()],
      shortcuts: {
        'border-main': 'border-gray:20',
        'bg-active': 'bg-gray:8',
      },
    }),
  ],
})
