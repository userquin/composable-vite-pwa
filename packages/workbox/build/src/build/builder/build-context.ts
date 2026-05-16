import type { SWType } from '../../types'
import type { BuildGenerateSWOptions, BuildSWOptions } from '../types'
import type { Bundler, BundlerOptions, ClassicBuild, OriginalEnvironmentData, ResolvedSWTargets } from './bundler-types'

export type Strategy = 'GenerateSW' | 'BuildSW'

export interface GeneratedAsset {
  name: string
  size: string
}

export interface BaseContext<
  S extends Strategy,
  B extends Bundler,
  BO extends BundlerOptions,
> {
  strategy: S
  bundler: B
  start: ReturnType<typeof performance.now>
  end: ReturnType<typeof performance.now>
  filePaths: GeneratedAsset[]
  tempFiles: string[]
  tempFileWrites: Promise<void>[]
  builds: BundlerOptions[]
  originalEnvironmentData: OriginalEnvironmentData
  resolvedSWTargets: ResolvedSWTargets
  classicBuild: ClassicBuild
  bundlerOptions: BO[]
  warnings: {
    manifest: string[]
    circular: string[]
  }
}

export interface GenerateContext<
  T extends SWType,
  B extends Bundler,
> extends BaseContext<'GenerateSW', B, BundlerOptions> {
  options: BuildGenerateSWOptions<T>
}

export interface BuildContext<
  T extends SWType,
  B extends Bundler,
  BO extends BundlerOptions,
> extends BaseContext<'BuildSW', B, BO> {
  options: BuildSWOptions<T, B>
}

function createBaseContext<
  S extends Strategy,
  B extends Bundler,
  BO extends BundlerOptions,
>(
  start: ReturnType<typeof performance.now>,
  strategy: S,
  bundler: B,
): BaseContext<S, B, BO> {
  return {
    strategy,
    bundler,
    start,
    end: start,
    filePaths: [],
    tempFiles: [],
    tempFileWrites: [],
    builds: undefined!,
    originalEnvironmentData: undefined!,
    bundlerOptions: undefined!,
    classicBuild: undefined!,
    resolvedSWTargets: undefined!,
    warnings: {
      manifest: [],
      circular: [],
    },
  }
}

export function createGenerateSWContext<
  T extends SWType,
  B extends Bundler,
>(
  buildStart: ReturnType<typeof performance.now>,
  bundler: B,
  options: BuildGenerateSWOptions<T>,
): GenerateContext<T, B> {
  return Object.assign(createBaseContext(buildStart, 'GenerateSW', bundler), {
    options,
  })
}

export function createBuildSWContext<
  T extends SWType,
  B extends Bundler,
  BO extends BundlerOptions,
>(
  buildStart: ReturnType<typeof performance.now>,
  bundler: B,
  options: BuildSWOptions<T, B>,
): BuildContext<T, B, BO> {
  return Object.assign(createBaseContext(buildStart, 'BuildSW', bundler), {
    options,
    bundlerOptions: undefined!,
  })
}
