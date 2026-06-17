import type { WorkboxCliConfig } from '../options'
import { getManifest } from '@composable-vite-pwa/workbox-build'
import { assertGetManifestOptions } from '../options'
import { reportManifest } from '../report'

export async function runGetManifest(config: WorkboxCliConfig) {
  assertGetManifestOptions(config.getManifest)
  reportManifest(await getManifest(config.getManifest))
}
