import { createRequire } from 'node:module'
import { defineConfig } from 'tsdown'
import {
  attw,
  nodeEnvDefine as define,
  publint,
} from '../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

export default defineConfig({
  entry: 'src/index.ts',
  platform: 'node',
  dts: true,
  define,
  attw,
  publint,
  deps: {
    neverBundle: [
      'astro',
      'vite',
      'rolldown',
      'magicast',
      '@composable-vite-pwa/unplugin-pwa',
      '@composable-vite-pwa/workbox-window',
      '@composable-vite-pwa/workbox-build',
    ],
  },
})
