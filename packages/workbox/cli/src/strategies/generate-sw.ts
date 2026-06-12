import type { WorkboxCliConfig } from '../options'
import { generateModernSW } from '@composable-vite-pwa/workbox-build'
import { assertGenerateSWOptions } from '../options'

export async function run(config: WorkboxCliConfig) {
  assertGenerateSWOptions(config.generateSW)
  await generateModernSW(config.generateSW)
}
