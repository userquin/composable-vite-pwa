import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import { workboxBanner as banner, cleanupJSTypes, fixTypesVersion } from '../../../tsdown-helper'

const require = createRequire(import.meta.url)
const _packageJson = require('./package.json')

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: './src/{config,index,types,generate-sw,get-manifest,inject-manifest}.ts',
  platform: 'node',
  banner,
  exports: fixTypesVersion,
  hooks: {
    'build:done': async () => {
      await cleanupJSTypes(cwd)
    },
  },
})
