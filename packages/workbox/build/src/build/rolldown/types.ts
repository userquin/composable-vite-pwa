import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('rolldown').TransformOptions['define']
  /**
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envDir?: string | false
  /**
   * @default VITE_
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envPrefix?: string | string[]
  plugins?: () => import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T, 'rolldown'> & ServiceWorkerOptions
