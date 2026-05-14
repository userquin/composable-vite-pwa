import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import {
  attw,
  workboxBanner as banner,
  // cleanupDualJSTypes,
  cleanupJSTypes,
  fixTypesVersion,
  publint,
} from '../../../tsdown-helper'

const require = createRequire(import.meta.url)
const { version } = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig(/* [ */{
  entry: [
    './src/{index,types,generate-sw,get-manifest,inject-manifest}.ts',
    {
      'build/*': [
        './src/build/*.ts',
        '!./src/build/generate-sw.ts',
      ],
      'build/vite/*': [
        './src/build/vite/*.ts',
        '!./src/build/vite/build-utils.ts',
        '!./src/build/vite/internal-types.ts',
      ],
      'build/rolldown/*': [
        './src/build/rolldown/*.ts',
        '!./src/build/rolldown/build-utils.ts',
        '!./src/build/rolldown/internal-types.ts',
      ],
    },
  ],
  platform: 'node',
  clean: true,
  banner,
  define: {
    __VITE_PWA_VERSION__: JSON.stringify(version),
  },
  attw,
  publint,
  exports: fixTypesVersion,
  deps: {
    neverBundle: ['magicast', 'rolldown', 'vite'],
  },
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
}, /* {
  entry: [
    {
      'build/rspack/!*': [
        './src/build/rspack/!*.ts',
        '!./src/build/rspack/build-utils.ts',
        '!./src/build/rspack/internal-types.ts',
      ],
      'build/webpack/!*': [
        './src/build/webpack/!*.ts',
        '!./src/build/webpack/build-utils.ts',
        '!./src/build/webpack/internal-types.ts',
      ],
    },
  ],
  platform: 'node',
  clean: false,
  format: ['esm', 'cjs'],
  banner,
  attw,
  publint,
  exports: fixTypesVersion,
  deps: {
    neverBundle: ['@rspack/core', 'magicast', 'rolldown', 'webpack'],
  },
  hooks: {
    'build:done': async () => {
      await cleanupDualJSTypes(cwd)
    },
  },
}] */)
