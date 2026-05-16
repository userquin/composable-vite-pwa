import type { ViteBuildOptions } from './internal-types'
import path from 'node:path'
import process from 'node:process'
import { prepareCircularDependencies } from '@composable-vite-pwa/workbox-build/build/bundler/bundler-utils'
import { build } from 'vite'
import { prepareBundlerBuildOptions } from '../bundler/bundler-build-utils'

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
  } = await prepareBundlerBuildOptions('vite', options)

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
