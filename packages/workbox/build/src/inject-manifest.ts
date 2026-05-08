import type { BuildResult, InjectManifestOptions } from './types'

export async function injectManifest(options: InjectManifestOptions): Promise<BuildResult> {
  return await import('./utils/build-inject-manifest').then(({ buildInjectManifest }) => buildInjectManifest(
    options,
  ))
}
