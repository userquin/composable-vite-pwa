import type { ManifestEntry, SWTargets, SWType } from '../../types'
import type { EnvironmentData } from '../types'

export interface OriginalEnvironmentData extends EnvironmentData {
  injectionPoint: string | false
}
export interface ResolvedSWTargets {
  classic: SWTargets
  module: SWTargets
}
export type Bundler = 'vite' | 'rolldown'
export interface BundlerOptions {
  bundler?: Bundler
  filePaths: string[]
  workboxRuntimeCompatible: boolean
  mode?: string
  swSrc: string
  swChunkName: string
  swDest: string
  swType: 'classic' | 'module'
  target: SWTargets
  minify: boolean
  inlineWorkboxRuntime: true | {
    workboxChunkName?: string
  }
  manifestEntries: ManifestEntry[]
  generateSW: boolean
  originalEnvironmentData: OriginalEnvironmentData
}

export interface PrepareBundlerOptions {
  mode: string
  swType: SWType
  target: ResolvedSWTargets
  swSrc: string
  swChunkName: string
  swDest: string
  classicSWDest: string
  moduleSWDest: string
  classicSWSrc: string
  classicSWChunkName: string
  moduleSWSrc: string
  moduleSWChunkName: string
  workboxRuntimeCompatible: boolean
  minify: boolean
  manifestEntries: ManifestEntry[]
  inlineWorkboxRuntime?: boolean
  generateSW?: {
    swCode: string
  }
  originalEnvironmentData: OriginalEnvironmentData
}

export interface ClassicRegionReplacement {
  search: string
  replacement: string
}

export interface ClassicBuild {
  swType: 'classic' | 'module'
  region: ClassicRegionReplacement
  swChunkName: string
  filePaths: string[]
  generateSW: boolean
  workboxName?: string
}

export type DetectorMode = 'generate-sw' | 'build-sw'
export type DetectionData<M extends DetectorMode> = M extends 'generate-sw'
  ? import('./detector-types').GenerateSWDependenciesResult
  : import('./detector-types').BuildSWResult
export interface LoadDetectorReturn<M extends DetectorMode> {
  detection: DetectionData<M>
  bundler: Bundler
  warned: boolean
}
