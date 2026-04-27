import type { BuildResult, ManifestEntry, SWType } from '../types'

export type InternalManifestEntry = ManifestEntry & { size: number }

export type GenerateSWResult<T extends SWType> = T extends 'classic'
  ? BuildResult
  : T extends 'module'
    ? BuildResult
    : {
        classic: BuildResult
        module: BuildResult
      }
