import type { BundlerOptions } from '../bundler/bundler-types'

export interface RolldownBuildOptions extends BundlerOptions {
  define?: import('rolldown').TransformOptions['define']
  plugins?: import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
  generateSW: boolean
}
