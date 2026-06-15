import type { WorkboxCliConfig } from '../options'
import { injectManifest } from '@composable-vite-pwa/workbox-build'
import { assertInjectManifestOptions } from '../options'
import { reportBuildResult } from '../report'

export async function run(config: WorkboxCliConfig) {
  assertInjectManifestOptions(config.injectManifest)
  reportBuildResult('inject-manifest', await injectManifest(config.injectManifest))
}
