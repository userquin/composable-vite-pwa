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

export default defineConfig([{
  entry: [
    'src/index.ts',
    'src/types.ts',
    'src/preset.ts',
    {
      'plugins/*': ['./src/plugins/*'],
    },
    {
      components: './src/components/index.ts',
    },
  ],
  platform: 'node',
  dts: true,
  define,
  clean: true,
  attw,
  publint,
  deps: {
    neverBundle: [
      '@react-router/dev',
      '@react-router/dev/config',
      '@react-router/dev/routes',
      'react',
      'react-jsx-runtime',
      'react-dom',
      'vite',
      'rolldown',
      'magicast',
      '@composable-vite-pwa/unplugin-pwa',
      '@composable-vite-pwa/workbox-window',
      '@composable-vite-pwa/workbox-build',
      'virtual:pwa-info',
      'virtual:pwa-assets/head',
      // 'virtual:vite-pwa/react-router/sw',
      '@composable-vite-pwa/workbox/swkit/core',
      '@composable-vite-pwa/workbox/swkit/precaching',
      '@composable-vite-pwa/workbox/swkit/routing',
    ],
  },
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
}, /* , {
  entry: [
    {
      components: './src/components/index.ts',
    },
  ],
  platform: 'neutral',
  dts: true,
  define,
  clean: true,
  attw,
  publint,
  deps: {
    neverBundle: [
      '@react-router/dev',
      'react',
      'react-dom',
      'virtual:pwa-info',
      'virtual:pwa-assets/head',
      // 'virtual:vite-pwa/react-router/sw',
      '@composable-vite-pwa/workbox/swkit/core',
      '@composable-vite-pwa/workbox/swkit/precaching',
      '@composable-vite-pwa/workbox/swkit/routing',
    ],
  },
} */])
