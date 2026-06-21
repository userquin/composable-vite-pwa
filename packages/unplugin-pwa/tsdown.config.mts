import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import { pwaBanner as banner, cleanupDistFiles } from '../../tsdown-helper'

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig([{
  entry: [
    {
      'node/*': ['./src/node/*.ts'],
      'node/vite/*': ['./src/node/vite/*.ts'],
      'node/vite/plugins/*': ['./src/node/vite/plugins/*.ts'],
    },
  ],
  platform: 'node',
  clean: true,
  dts: true,
  banner,
  attw: {
    profile: 'esm-only',
  },
  deps: {
    neverBundle: [
      'vite',
      'webpack',
      'rspack',
      'rolldown',
      '@composable-vite-pwa/workbox-window',
      '@composable-vite-pwa/workbox-build',
    ],
  },
  hooks: {
    'build:done': async () => {
      await cleanupDistFiles(cwd, [
        'node/types.mjs',
        'node/context-types.mjs',
      ])
    },
  },
}, {
  entry: {
    'client/build/*': ['./src/client/build/*.ts'],
    'client/dev/*': ['./src/client/dev/*.ts'],
    // 'client/dev/vite/*': ['./src/client/dev/vite/*.ts'],
  },
  platform: 'browser',
  clean: false,
  banner,
  define: {
    'import.meta.PWA_ESM_FALLBACK_SW': 'import.meta.PWA_ESM_FALLBACK_SW',
    'import.meta.PWA_SW_URL': 'import.meta.PWA_SW_URL',
    'import.meta.PWA_SW_CLASSIC_URL': 'import.meta.PWA_SW_CLASSIC_URL',
    'import.meta.PWA_SW_MODULE_URL': 'import.meta.PWA_SW_MODULE_URL',
    'import.meta.PWA_SW_SCOPE': 'import.meta.PWA_SW_SCOPE',
    'import.meta.PWA_SW_TYPE': 'import.meta.PWA_SW_TYPE',
    'import.meta.PWA_SW_UPDATE_VIA_CACHE': 'import.meta.PWA_SW_UPDATE_VIA_CACHE',
    'import.meta.PWA_DEV_SERVER': 'import.meta.PWA_DEV_SERVER',
    'import.meta.PWA_SW_AUTO_UPDATE': 'import.meta.PWA_SW_AUTO_UPDATE',
    'import.meta.PWA_DEV_ENABLED': 'import.meta.PWA_DEV_ENABLED',
    'import.meta.PWA_DEV_UI_ENABLED': 'import.meta.PWA_DEV_UI_ENABLED',
  },
  deps: {
    neverBundle: [
      '@composable-vite-pwa/workbox-window',
      'preact/hooks',
      'react',
      'solid-js',
      'svelte/store',
      'vue',
    ],
  },
  dts: false,
}])
