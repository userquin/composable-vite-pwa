import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('vite').UserConfig['define']
  envDir?: import('vite').UserConfig['envDir']
  envPrefix?: import('vite').UserConfig['envPrefix']
  plugins?: () => import('vite').PluginOption[]
  sourcemap?: import('vite').BuildOptions['sourcemap']
  // todo: add custom chunk file names
  // todo: add custom callback customizer for vite build
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
