import type { ViteBuildOptions } from './internal-types'
import path from 'node:path'
import process from 'node:process'
import { build } from 'vite'
import { prepareCircularDependencies } from '../builder/prepare-circular-dependencies'
import { prepareRolldownOutputOptions } from '../builder/prepare-rolldown-output-options'

export async function prepareViteBuild(
  options: ViteBuildOptions,
): ReturnType<typeof build> {
  const {
    swSrc,
    swDest,
    target,
    minify,
    sourcemap,
    envPrefix,
    envDir,
    logLevel,
  } = options

  const {
    plugins,
    define,
    rolldownOptions: output,
  } = await prepareRolldownOutputOptions('vite', options)

  const { checks, onLog } = prepareCircularDependencies<'vite'>(options)

  return await build({
    plugins,
    configFile: false,
    // don't copy anything from public dir
    publicDir: false,
    forceOptimizeDeps: false,
    envPrefix,
    envDir,
    logLevel,
    build: {
      emptyOutDir: false,
      outDir: path.dirname(path.resolve(process.cwd(), swDest)),
      target,
      minify,
      sourcemap,
      manifest: false,
      rolldownOptions: {
        input: swSrc,
        platform: 'browser',
        treeshake: true,
        checks,
        onLog,
        output,
        transform: {
          define,
        },
      },
    },
  })
}
