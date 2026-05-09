import type { BundlerOptions } from '../bundler/bundler-types'

export interface ViteBuildOptions extends BundlerOptions {
  plugins?: import('vite').PluginOption[]
  define?: import('vite').UserConfig['define']
  envPrefix?: import('vite').UserConfig['envPrefix']
  envDir?: import('vite').UserConfig['envDir']
  sourcemap?: import('vite').BuildOptions['sourcemap']
  generateSW: boolean
}
