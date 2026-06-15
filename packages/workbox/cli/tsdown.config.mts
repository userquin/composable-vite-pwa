import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'
import {
  attw,
  workboxBanner as banner,
  cleanupCliFiles,
  publint,
} from '../../../tsdown-helper'

const cwd = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  entry: ['./src/index.ts', './src/cli.ts'],
  platform: 'node',
  banner,
  attw,
  publint,
  hooks: {
    'build:done': async () => {
      await cleanupCliFiles(cwd)
    },
  },
})
