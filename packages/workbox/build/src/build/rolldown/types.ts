import type { SWType } from '../../types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('rolldown').TransformOptions['define']
  plugins?: () => import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
}

export type BuildServiceWorkerOptions<T extends SWType> = Omit<BuildSWOptions<T, 'rolldown'>, 'define'> & ServiceWorkerOptions
