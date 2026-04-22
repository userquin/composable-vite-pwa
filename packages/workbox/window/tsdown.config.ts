import { defineConfig } from 'tsdown'
import {
  attw,
  workboxBanner as banner,
  nodeEnvDefine as define,
  publint,
} from '../../../tsdown-helper'

export default defineConfig({
  entry: './src/index.ts',
  platform: 'browser',
  banner,
  define,
  attw,
  publint,
})
