import type { GenerateSWOptions, SWType } from '../../types'
import type { BuildGenerateSWOptions, BuildSWOptions } from '../types'
import type { Bundler, BundlerOptions, ClassicBuild } from './bundler-types'

export interface GeneratedAsset {
  name: string
  size: string
}

export interface BuildTelemetry {
  start: ReturnType<typeof performance.now>
  end: ReturnType<typeof performance.now>
  filePaths: GeneratedAsset[]
  tempFiles: string[]
  tempFileWrites: Promise<void>[]
  builds: BundlerOptions[]
}

export interface BaseContext<
  B extends Bundler,
  BO extends BundlerOptions,
> {
  bundler: B
  buildTelemetry: BuildTelemetry
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
> extends BaseContext<B, BundlerOptions> {
  options: GenerateSWOptions<T>
}

export interface BuildContext<
  T extends SWType,
  B extends Bundler,
  BO extends BundlerOptions,
> extends BaseContext<B, BO> {
  options: BuildSWOptions<T, B>
}

function createBaseContext<
  B extends Bundler,
  BO extends BundlerOptions,
>(
  start: ReturnType<typeof performance.now>,
  bundler: B,
): BaseContext<B, BO> {
  return {
    bundler,
    buildTelemetry: {
      start,
      end: start,
      filePaths: [],
      tempFiles: [],
      tempFileWrites: [],
      builds: [],
    },
    bundlerOptions: undefined!,
    classicBuild: undefined!,
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
  return Object.assign(createBaseContext(buildStart, bundler), {
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
  return Object.assign(createBaseContext(buildStart, bundler), {
    options,
    bundlerOptions: undefined!,
  })
}
