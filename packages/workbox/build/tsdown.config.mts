import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import { attw, workboxBanner as banner, cleanupJSTypes, fixTypesVersion, publint } from '../../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: './src/{index,types,generate-sw,get-manifest,inject-manifest}.ts',
  platform: 'node',
  banner,
  attw,
  publint,
  exports: fixTypesVersion,
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
})
