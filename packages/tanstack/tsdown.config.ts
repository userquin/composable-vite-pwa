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
  entry: [
    'src/create-nitro-pwa-context.ts',
    'src/create-pwa-context.ts',
    'src/index.ts',
    'src/load-external-configuration.ts',
    'src/types.ts',
    {
      'vite/*': ['./src/vite/*'],
      'vite/nitro/*': ['./src/vite/nitro/*'],
    },
    {
      'react-components': './src/react-components/index.ts',
    },
    // {
    //   'solid-components': './src/solid-components/index.ts',
    // },
  ],
  platform: 'node',
  dts: true,
  define,
  clean: true,
  attw,
  publint,
  deps: {
    neverBundle: [
      'react',
      'react-jsx-runtime',
      'react-dom',
      'vite',
      'rolldown',
      'magicast',
      'nitro',
      '@composable-vite-pwa/unplugin-pwa',
      '@composable-vite-pwa/workbox-window',
      '@composable-vite-pwa/workbox-build',
      'virtual:pwa-info',
      'virtual:pwa-assets/head',
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
})
