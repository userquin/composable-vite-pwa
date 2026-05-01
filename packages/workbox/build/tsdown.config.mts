import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import { attw, workboxBanner as banner, cleanupJSTypes, fixTypesVersion, publint } from '../../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: [
    './src/{index,types,generate-sw,get-manifest,inject-manifest}.ts',
    {
      'build/*': ['./src/build/*.ts'],
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
    neverBundle: ['oxc-transform', 'rolldown', 'vite'],
  },
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
})
