import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('rolldown').TransformOptions['define']
  plugins?: () => import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
  // todo: add custom chunk file names
  // todo: add custom callback customizer for rolldown and write
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
