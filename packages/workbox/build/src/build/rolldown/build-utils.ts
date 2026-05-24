import type { RolldownBuildOptions } from './internal-types'
import { prepareManifestName } from '@composable-vite-pwa/workbox-build/build/builder/prepare-manifest-name'
import { generateManifest } from '@composable-vite-pwa/workbox-build/build/rolldown/generate-manifest'
import { rolldown } from 'rolldown'
import { prepareCircularDependencies } from '../builder/prepare-circular-dependencies'
import { prepareRolldownOutputOptions } from '../builder/prepare-rolldown-output-options'

export async function prepareRolldownBuild(
  options: RolldownBuildOptions,
): Promise<import('rolldown').RolldownOutput> {
  const {
    swSrc,
    target,
    minify,
    sourcemap,
    logLevel,
  } = options

  const {
    plugins,
    define,
    rolldownOptions,
  } = await prepareRolldownOutputOptions('rolldown', options)

  const { checks, onLog } = prepareCircularDependencies<'rolldown'>(options)

  const instance = await rolldown({
    input: swSrc,
    platform: 'browser',
    treeshake: true,
    plugins,
    logLevel,
    checks,
    onLog,
    transform: {
      define,
      target,
    },
  })

  const output = await instance.write(Object.assign(rolldownOptions, {
    sourcemap,
    minify,
  }))

  const manifestName = prepareManifestName(options)
  if (manifestName) {
    await generateManifest(manifestName, options, output)
  }

  return output
}
