import type { BuildResult, SWType } from '../../types'
import type { BuildContext } from './build-context'
import type { Bundler, BundlerOptions } from './bundler-types'
import { generateManifestEntries } from '../../utils/generate-manifest-entries'
import { deepMergeObject } from '../../utils/utils'
import { validateBuildSW } from '../../validation/build-validation-helper'
import { logPWAWorkboxResult } from './log-result'
import { prepareBundlerOptions } from './prepare-bundler-options'
import { runBundlerBuild } from './run-bundler-build'
import {
  extractOriginalEnvironmentData,
  prepareSWTargets,
  resolveSWNamesAndGlobIgnores,
} from './utils'

export async function internalBuildSW<
  T extends SWType,
  B extends Bundler,
  BO extends BundlerOptions,
>(
  context: BuildContext<T, B, BO>,
  prepareBuilds: (context: BuildContext<T, B, BO>) => Promise<any>[],
): Promise<BuildResult> {
  const optionsWithDefaults = await validateBuildSW(
    context.options,
  )

  // clone mode, baseUrl, envDir, envPrefix, define and injectionPoint
  context.originalEnvironmentData = extractOriginalEnvironmentData(
    context.options,
  )

  deepMergeObject(
    context.options,
    optionsWithDefaults,
  )

  const {
    mode,
    workboxRuntimeCompatible,
    target,
    minify,
    ...injectManifest
  } = context.options

  context.resolvedSWTargets = prepareSWTargets(
    context.options.target!,
  )

  const {
    swSrc,
    swChunkName,
    swDest,
    classicSWDest,
    moduleSWDest,
  } = resolveSWNamesAndGlobIgnores(
    injectManifest,
    injectManifest.swSrc,
    false,
  )

  const {
    manifestEntries,
    warnings,
    count,
    size,
  } = await generateManifestEntries(
    injectManifest,
    injectManifest.globDirectory!,
  )

  const {
    builds,
    filePathsMap,
    classicCircularDependencies,
    moduleCircularDependencies,
  } = prepareBundlerOptions({
    mode: mode!,
    swType: context.options.swType!,
    swSrc,
    swChunkName,
    swDest,
    classicSWDest,
    moduleSWDest,
    classicSWSrc: '',
    classicSWChunkName: '',
    moduleSWSrc: '',
    moduleSWChunkName: '',
    inlineWorkboxRuntime: context.options.inlineWorkboxRuntime,
    minify: minify!,
    manifestEntries,
    target: context.resolvedSWTargets,
    workboxRuntimeCompatible: workboxRuntimeCompatible!,
    originalEnvironmentData: context.originalEnvironmentData,
  })

  context.builds = builds

  const buildResult = await runBundlerBuild(
    count,
    size,
    warnings,
    builds,
    filePathsMap,
    [],
    () => prepareBuilds(context),
  )

  // since the source code is the same, on dual build we pick classic ones
  const circularDependencies = classicCircularDependencies.length > 0
    ? classicCircularDependencies
    : moduleCircularDependencies

  logPWAWorkboxResult(
    context.bundler,
    'buildSW',
    buildResult,
    performance.now() - context.start,
    context.options.logLevel!,
    context.options.bundlerLogLevel!,
    circularDependencies,
  )

  return buildResult
}
