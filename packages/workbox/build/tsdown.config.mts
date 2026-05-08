import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import {
  attw,
  workboxBanner as banner,
  cleanupJSTypes,
  fixTypesVersion,
  publint,
} from '../../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: [
    './src/{index,types,generate-sw,get-manifest,inject-manifest}.ts',
    {
      'build/*': [
        './src/build/*.ts',
      ],
      'build/vite/*': [
        './src/build/vite/*.ts',
        '!./src/build/vite/build-utils.ts',
      ],
      'build/rolldown/*': [
        './src/build/rolldown/*.ts',
        '!./src/build/rolldown/build-utils.ts',
      ],
    },
  ],
  platform: 'node',
  clean: true,
  banner,
  attw,
  publint,
  exports: fixTypesVersion,
  deps: {
    skipNodeModulesBundle: true,
    neverBundle: ['magicast', 'rolldown', 'vite'],
  },
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
})
