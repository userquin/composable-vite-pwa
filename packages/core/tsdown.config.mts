import { defineConfig } from 'tsdown'
import { pwaBanner as banner } from '../../tsdown-helper'

export default defineConfig([{
  entry: 'src/index.ts',
  platform: 'node',
  clean: true,
  dts: true,
  banner,
  attw: {
    profile: 'esm-only',
  },
}, {
  entry: {
    'client/build/*': ['./src/client/build/*.ts'],
    'client/dev/*': ['./src/client/dev/*.ts'],
  },
  platform: 'browser',
  clean: false,
  banner,
  define: {
    'process.env.VITE_PWA_ESM_FALLBACK_SW': 'process.env.VITE_PWA_ESM_FALLBACK_SW',
    '__SW_URL__': '__SW_URL__',
    '__SW_SCOPE__': '__SW_SCOPE__',
    '__SW_UPDATE_VIA_CACHE__': '__SW_UPDATE_VIA_CACHE__',
    '__SW_AUTO_UPDATE__': '__SW_AUTO_UPDATE__',
    '__SW_SELF_DESTROYING__': '__SW_SELF_DESTROYING__',
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
