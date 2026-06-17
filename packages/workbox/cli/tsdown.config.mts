import { createRequire } from 'node:module'
import { defineConfig } from 'tsdown'
import {
  attw,
  workboxBanner as banner,
  publint,
} from '../../../tsdown-helper'

const require = createRequire(import.meta.url)

export default defineConfig([{
  entry: './src/cli.ts',
  platform: 'node',
  target: 'node20',
  clean: true,
  dts: false,
  minify: false,
  deps: {
    onlyBundle: false,
  },
  define: {
    __VERSION__: JSON.stringify(require('./package.json').version),
  },
  banner,
}, {
  entry: './src/index.ts',
  platform: 'node',
  target: 'node20',
  dts: true,
  clean: false,
  publint,
  attw,
  deps: {
    onlyBundle: false,
  },
  banner,
}])
