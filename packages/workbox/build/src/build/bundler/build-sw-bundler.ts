import type { BuildResult, SWType } from '../../types'
import type { BuildSWOptions } from '../types'
import type { BundlerOptions } from './bundler-types'
import { generateManifestEntries } from '../../utils/generate-manifest-entries'
import { deepMergeObject } from '../../utils/utils'
import { validateBuildSW } from '../../validation/build-validation-helper'
import { prepareBundlerOptions, runBundlerBuild } from './bundler-utils'
import {
  extractOriginalEnvironmentData,
  prepareSWTargets,
  resolveSWNamesAndGlobIgnores,
} from './utils'

export async function internalBuildSW<T extends SWType, Options extends BuildSWOptions<T>>(
  options: Options,
  prepareBuilds: (bundlerOptions: BundlerOptions[]) => Promise<any>[],
): Promise<BuildResult> {
  const optionsWithDefaults = await validateBuildSW(
    options,
  )

  // clone mode, baseUrl, envDir, envPrefix, define and injectionPoint
  const originalEnvironmentData = extractOriginalEnvironmentData(
    options,
    typeof options.injectionPoint === 'string' && options.injectionPoint ? options.injectionPoint : false,
  )

  deepMergeObject(
    options,
    optionsWithDefaults,
  )

  const {
    mode,
    workboxRuntimeCompatible,
    target,
    minify,
    ...injectManifest
  } = options

  const useTargets = prepareSWTargets(
    options.target!,
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

  const { builds, filePathsMap } = prepareBundlerOptions({
    mode: mode || 'production',
    swType: options.swType!,
    swSrc,
    swChunkName,
    swDest,
    classicSWDest,
    moduleSWDest,
    classicSWSrc: '',
    classicSWChunkName: '',
    moduleSWSrc: '',
    moduleSWChunkName: '',
    inlineWorkboxRuntime: options.inlineWorkboxRuntime,
    minify: minify!,
    manifestEntries,
    target: useTargets,
    workboxRuntimeCompatible: workboxRuntimeCompatible!,
    originalEnvironmentData,
  })

  return await runBundlerBuild(
    count,
    size,
    warnings,
    builds,
    filePathsMap,
    [],
    prepareBuilds,
  )
}
