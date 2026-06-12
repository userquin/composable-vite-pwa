import type { WorkboxCliConfig } from '../options'
import { buildModernSW } from '@composable-vite-pwa/workbox-build'
import { assertBuildSWOptions } from '../options'

export async function run(config: WorkboxCliConfig) {
  assertBuildSWOptions(config.buildSW)
  await buildModernSW(config.buildSW)
}
