import type { WorkboxCliConfig } from '../options'
import { generateSW } from '@composable-vite-pwa/workbox-build/build/rolldown/generate-sw'
import { assertGenerateSWOptions } from '../options'

export async function runGenerateSW(config: WorkboxCliConfig) {
  assertGenerateSWOptions(config.generateSW)
  await generateSW(config.generateSW)
}
