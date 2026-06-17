import type { WorkboxCliConfig } from '../options'
import { buildSW } from '@composable-vite-pwa/workbox-build/build/rolldown/build-sw'
import { assertBuildSWOptions } from '../options'

export async function runBuildSW(config: WorkboxCliConfig) {
  assertBuildSWOptions(config.buildSW)
  await buildSW(config.buildSW)
}
