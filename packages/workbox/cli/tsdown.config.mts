import { defineConfig } from 'tsdown'
import { workboxBanner as banner } from '../../../tsdown-helper'

export default defineConfig({
  entry: './src/cli.ts',
  platform: 'node',
  dts: false,
  banner,
})
