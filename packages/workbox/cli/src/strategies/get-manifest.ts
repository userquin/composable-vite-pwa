import type { WorkboxCliConfig } from '../options'
import { getManifest } from '@composable-vite-pwa/workbox-build'
import { assertGetManifestOptions } from '../options'

export async function run(config: WorkboxCliConfig) {
  assertGetManifestOptions(config.getManifest)
  await getManifest(config.getManifest)
}
