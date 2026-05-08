import type { SWType } from '../../types'
import type { BundlerOptions } from '../bundler/bundler-types'
import type { BuildSWOptions } from '../types'

export interface ServiceWorkerOptions {
  define?: import('rolldown').TransformOptions['define']
  plugins?: () => import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
}

export interface RolldownBuildOptions extends BundlerOptions {
  define?: import('rolldown').TransformOptions['define']
  plugins?: import('rolldown').Plugin[]
  sourcemap?: import('rolldown').OutputOptions['sourcemap']
  generateSW: boolean
}

export type BuildServiceWorkerOptions<T extends SWType> = BuildSWOptions<T> & ServiceWorkerOptions
