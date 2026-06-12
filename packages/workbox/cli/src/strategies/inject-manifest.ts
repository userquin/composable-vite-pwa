import type { WorkboxCliConfig } from '../options'
import { injectManifest } from '@composable-vite-pwa/workbox-build'
import { assertInjectManifestOptions } from '../options'

export async function run(config: WorkboxCliConfig) {
  assertInjectManifestOptions(config.injectManifest)
  await injectManifest(config.injectManifest)
}
