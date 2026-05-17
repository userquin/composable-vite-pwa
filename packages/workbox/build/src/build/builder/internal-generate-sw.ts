import type { BuildResult, SWType } from '../../types'
import type { GenerateContext } from './build-context'
import type { Bundler } from './bundler-types'
import { deepMergeObject } from '../../utils/utils'
import { validateGenerateSW } from '../../validation/validation-helper'
import { logPWAWorkboxResult } from './log-result'
import { prepareBundlerOptions } from './prepare-bundler-options'
import { prepareSWCode } from './prepare-sw-code'
import { runBundlerBuild } from './run-bundler-build'
import {
  extractOriginalEnvironmentData,
  prepareSWTargets,
  resolveSWNamesAndGlobIgnores,
} from './utils'

export async function internalGenerateSW<
  T extends SWType,
  B extends Bundler,
>(
  context: GenerateContext<T, B>,
  prepareBuilds: (context: GenerateContext<T, B>) => Promise<any>[],
): Promise<BuildResult> {
  const optionsWithDefaults = await validateGenerateSW(
    context.options,
  )

  // clone mode, baseUrl, envDir, envPrefix and define (GenerateSW doesn't have injectionOptions)
  context.originalEnvironmentData = extractOriginalEnvironmentData(
    context.options,
    false,
  )

  deepMergeObject(
    context.options,
    optionsWithDefaults,
  )

  const {
    classicSWSrc,
    classicSWChunkName,
    moduleSWSrc,
    moduleSWChunkName,
    swDest,
    classicSWDest,
    moduleSWDest,
  } = resolveSWNamesAndGlobIgnores(
    context.options,
    '',
    true,
  )

  const useTargets = prepareSWTargets(
    context.options.target!,
  )

  const {
    count,
    size,
    warnings,
    swCode,
  } = await prepareSWCode(
    context.options,
    context.options.globDirectory,
  )

  const {
    builds,
    filePathsMap,
    tempFiles,
    tempFileWrites,
  } = prepareBundlerOptions({
    mode: context.options.mode || 'production',
    swType: context.options.swType!,
    swSrc: '',
    swChunkName: '',
    swDest,
    classicSWDest,
    moduleSWDest,
    classicSWSrc: classicSWSrc!,
    classicSWChunkName: classicSWChunkName!,
    moduleSWSrc: moduleSWSrc!,
    moduleSWChunkName: moduleSWChunkName!,
    inlineWorkboxRuntime: context.options.inlineWorkboxRuntime,
    minify: context.options.minify!,
    manifestEntries: [],
    target: useTargets,
    workboxRuntimeCompatible: context.options.workboxRuntimeCompatible!,
    generateSW: { swCode },
    originalEnvironmentData: context.originalEnvironmentData,
  })

  const buildResult = await runBundlerBuild(
    count,
    size,
    warnings,
    context.warnings.circular,
    context.warnings.customChunks,
    builds,
    filePathsMap,
    tempFileWrites,
    () => prepareBuilds(context),
    tempFiles,
  )

  logPWAWorkboxResult(
    context.bundler,
    'generateSW',
    buildResult,
    performance.now() - context.start,
    context.options.logLevel!,
    context.options.bundlerLogLevel!,
  )

  return buildResult
}
