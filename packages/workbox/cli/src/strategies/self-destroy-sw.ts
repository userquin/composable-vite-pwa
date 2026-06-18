import type { WorkboxCliConfig } from '../options'
import { selfDestroyingSW } from '@composable-vite-pwa/workbox-build/self-destroying-sw'
import { assertSelfDestroyingSW } from '../options'

export async function runSelfDestroyingSW(config: WorkboxCliConfig) {
  assertSelfDestroyingSW(config.selfDestroying)
  await selfDestroyingSW(config.selfDestroying)
}
