import type { SWType } from '../../types'
import type { BundlerOptions } from '../bundler/bundler-types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('vite').UserConfig['define']
  envDir?: import('vite').UserConfig['envDir']
  envPrefix?: import('vite').UserConfig['envPrefix']
  plugins?: () => import('vite').PluginOption[]
  sourcemap?: import('vite').BuildOptions['sourcemap']
}

export interface ViteBuildOptions extends BundlerOptions {
  plugins?: import('vite').PluginOption[]
  define?: import('vite').UserConfig['define']
  envPrefix?: import('vite').UserConfig['envPrefix']
  envDir?: import('vite').UserConfig['envDir']
  sourcemap?: import('vite').BuildOptions['sourcemap']
  generateSW: boolean
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
