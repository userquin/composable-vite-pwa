import type { ManifestEntry } from '@composable-vite-pwa/workbox-build/types'

export type InternalManifestEntry = ManifestEntry & { size: number }
