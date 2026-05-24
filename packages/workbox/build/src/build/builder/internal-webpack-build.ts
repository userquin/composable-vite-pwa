import type { BuildServiceWorkerOptions, SWType } from '../../build/rolldown/index'
import type { BuildGenerateSWOptions } from '../../build/types'
import type { Strategy, WorkboxBuildConfiguration } from '../../config/types'
import type { InjectManifestOptions } from '../../types'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

interface WebpackBuildContext {
  cwd?: string
  outputPath?: string
}

type StrategyOptions<T extends SWType>
  = | BuildServiceWorkerOptions<T>
    | BuildGenerateSWOptions<T>
    | InjectManifestOptions

function mergeStrategyOptions<T extends SWType>(
  left: Partial<WorkboxBuildConfiguration<Strategy, T>>,
  right: Partial<WorkboxBuildConfiguration<Strategy, T>>,
): Partial<WorkboxBuildConfiguration<Strategy, T>> {
  const merged = Object.assign({}, left, right) as Partial<WorkboxBuildConfiguration<Strategy, T>>

  for (const key of ['buildSW', 'generateSW', 'injectManifest'] as const) {
    const leftValue = left[key] as any
    const rightValue = right[key] as any
    if (leftValue || rightValue) {
      const writableMerged = merged as any
      writableMerged[key] = {
        ...leftValue,
        ...rightValue,
        options: {
          ...leftValue?.options,
          ...rightValue?.options,
        },
      }
    }
  }

  return merged
}

async function loadConfiguration<T extends SWType>(
  options: Partial<WorkboxBuildConfiguration<Strategy, T>>,
): Promise<Partial<WorkboxBuildConfiguration<Strategy, T>>> {
  if (!options.path) {
    return options
  }

  const cwd = path.resolve(process.cwd(), options.cwd || '.')
  const configPath = path.isAbsolute(options.path)
    ? options.path
    : path.resolve(cwd, options.path)
  const configModule = await import(pathToFileURL(configPath).href)
  const loaded = configModule.default ?? configModule.options ?? configModule.config ?? configModule
  const config = typeof loaded === 'function'
    ? await loaded()
    : loaded

  const external = config as Partial<WorkboxBuildConfiguration<Strategy, T>>
  return options.mergeOptions
    ? mergeStrategyOptions(external, options)
    : mergeStrategyOptions(external, {
        cwd: options.cwd,
        strategy: options.strategy,
      })
}

function resolveFrom(base: string, value: string | undefined): string | undefined {
  if (!value) {
    return value
  }

  return path.isAbsolute(value) ? value : path.resolve(base, value)
}

function resolveOutputPath(outputPath: string | undefined, fallbackCwd: string): string {
  return outputPath ? path.resolve(fallbackCwd, outputPath) : fallbackCwd
}

function prepareStrategyOptions<T extends SWType>(
  strategyOptions: StrategyOptions<T>,
  {
    cwd,
    outputPath,
  }: Required<WebpackBuildContext>,
) {
  const data = Object.assign({}, strategyOptions) as any
  data.globDirectory = data.globDirectory
    ? resolveFrom(cwd, data.globDirectory)
    : outputPath

  if ('swSrc' in data) {
    data.swSrc = resolveFrom(cwd, data.swSrc)
  }

  if ('swDest' in data) {
    data.swDest = resolveFrom(outputPath, data.swDest)
  }

  return data
}

export async function internalWebpackBuild<
  S extends Strategy,
  T extends SWType = 'classic',
>(
  pluginName: string,
  buildContext: WebpackBuildContext = {},
  options: Partial<WorkboxBuildConfiguration<S, T>> = {},
) {
  const resolvedOptions = await loadConfiguration(options as Partial<WorkboxBuildConfiguration<Strategy, T>>)
  const { strategy, buildSW, generateSW, injectManifest } = resolvedOptions
  const cwd = path.resolve(process.cwd(), resolvedOptions.cwd || buildContext.cwd || '.')
  const outputPath = resolveOutputPath(buildContext.outputPath, cwd)
  const context = { cwd, outputPath }

  // We extract the host compiler output directory to use as the default globDirectory.

  switch (strategy) {
    case 'build-sw': {
      const { buildSW: runBuildSW } = await import('../rolldown/build-sw')

      const data = prepareStrategyOptions(
        (buildSW?.options ?? {}) as BuildServiceWorkerOptions<T>,
        context,
      ) as BuildServiceWorkerOptions<T>
      await runBuildSW(data)
      break
    }

    case 'generate-sw': {
      const { generateSW: runGenerateSW } = await import('../rolldown/generate-sw')

      const data = prepareStrategyOptions(
        (generateSW?.options ?? {}) as BuildGenerateSWOptions<T>,
        context,
      ) as BuildGenerateSWOptions<T>

      await runGenerateSW(data)
      break
    }

    case 'inject-manifest': {
      const { injectManifest: runInjectManifest } = await import('../../inject-manifest')

      const data = prepareStrategyOptions(
        (injectManifest?.options ?? {}) as InjectManifestOptions,
        context,
      ) as InjectManifestOptions
      await runInjectManifest(data)
      break
    }

    default: {
      throw new Error(`[${pluginName}] Unsupported workflow strategy: "${strategy}"`)
    }
  }
}
