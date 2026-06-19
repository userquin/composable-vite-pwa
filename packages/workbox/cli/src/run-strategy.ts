import type { BuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/rolldown/types'
import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { GetManifestOptions, InjectManifestOptions, SelfDestroyingOptions } from '@composable-vite-pwa/workbox-build/types'
import type { CliStrategy, WorkboxCliConfig } from './options.js'
import { reportBuildResult, reportManifest } from './report.js'

export async function runStrategy(
  strategy: CliStrategy,
  config: WorkboxCliConfig,
): Promise<void> {
  switch (strategy) {
    case 'generate-sw': {
      const { generateSW } = await import('@composable-vite-pwa/workbox-build/build/rolldown/generate-sw')
      await generateSW(config.generateSW as BuildGenerateSWOptions<any>)
      break
    }
    case 'build-sw': {
      const { buildSW } = await import('@composable-vite-pwa/workbox-build/build/rolldown/build-sw')
      await buildSW(config.buildSW as BuildServiceWorkerOptions<any>)
      break
    }
    case 'inject-manifest': {
      const { injectManifest } = await import('@composable-vite-pwa/workbox-build')
      reportBuildResult('inject-manifest', await injectManifest(config.injectManifest as InjectManifestOptions))
      break
    }
    case 'get-manifest': {
      const { getManifest } = await import('@composable-vite-pwa/workbox-build')
      reportManifest(await getManifest(config.getManifest as GetManifestOptions))
      break
    }
    case 'self-destroy-sw': {
      const { selfDestroyingSW } = await import('@composable-vite-pwa/workbox-build/self-destroying-sw')
      await selfDestroyingSW(config.selfDestroying as SelfDestroyingOptions)
      break
    }
    default: {
      throw new Error(`Unsupported Workbox strategy: "${strategy as string}"`)
    }
  }
}
