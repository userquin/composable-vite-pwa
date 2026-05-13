import type { RolldownBuildOptions } from './internal-types'
import { rolldown } from 'rolldown'
import { prepareBundlerBuildOptions } from '../bundler/bundler-build-utils'

export async function prepareRolldownBuild(
  options: RolldownBuildOptions,
): Promise<import('rolldown').RolldownOutput> {
  const {
    swSrc,
    target,
    minify,
    sourcemap,
  } = options

  const {
    plugins,
    define,
    rolldownOptions,
  } = await prepareBundlerBuildOptions('rolldown', options)

  const instance = await rolldown({
    input: swSrc,
    platform: 'browser',
    treeshake: true,
    plugins,
    transform: {
      define,
      target,
    },
  })

  return await instance.write(Object.assign(rolldownOptions, {
    sourcemap,
    minify,
  }))
}
