import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import {
  attw,
  cleanupJSTypes,
  nodeEnvDefine as define,
  publint,
} from '../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: ['src/index.ts', 'src/types.ts'],
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
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
})
