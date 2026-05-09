import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('vite').UserConfig['define']
  envDir?: import('vite').UserConfig['envDir']
  envPrefix?: import('vite').UserConfig['envPrefix']
  plugins?: () => import('vite').PluginOption[]
  sourcemap?: import('vite').BuildOptions['sourcemap']
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
