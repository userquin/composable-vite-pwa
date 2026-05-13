import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('vite').UserConfig['define']
  /**
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envDir?: import('vite').UserConfig['envDir']
  /**
   * @default VITE_
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envPrefix?: import('vite').UserConfig['envPrefix']
  plugins?: () => import('vite').PluginOption[]
  sourcemap?: import('vite').BuildOptions['sourcemap']
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
