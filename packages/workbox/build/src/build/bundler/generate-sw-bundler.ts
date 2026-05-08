import type { BuildResult, SWType } from '../../types'
import type { BuildGenerateSWOptions } from '../types'
import type { BundlerOptions } from './bundler-types'
import { deepMergeObject } from '../../utils/utils'
import { validateGenerateSW } from '../../validation/validation-helper'
import { prepareBundlerOptions, runBundlerBuild } from './bundler-utils'
import { prepareSWCode } from './prepare-sw-code'
import {
  prepareSWTargets,
  resolveSWNamesAndGlobIgnores,
} from './utils'

export async function internalGenerateSW<T extends SWType, Options extends BuildGenerateSWOptions<T>>(
  options: Options,
  prepareBuilds: (bundlerOptions: BundlerOptions[]) => Promise<any>[],
): Promise<BuildResult> {
  const optionsWithDefaults = await validateGenerateSW(
    options,
  )

  deepMergeObject(
    options,
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
    options,
    '',
    true,
  )

  const useTargets = prepareSWTargets(
    options.target!,
  )

  const {
    count,
    size,
    warnings,
    swCode,
  } = await prepareSWCode(
    options,
    options.globDirectory,
  )

  const {
    builds,
    filePathsMap,
    tempFiles,
    tempFileWrites,
  } = prepareBundlerOptions({
    mode: options.mode || 'production',
    swType: options.swType!,
    swSrc: '',
    swChunkName: '',
    swDest,
    classicSWDest,
    moduleSWDest,
    classicSWSrc: classicSWSrc!,
    classicSWChunkName: classicSWChunkName!,
    moduleSWSrc: moduleSWSrc!,
    moduleSWChunkName: moduleSWChunkName!,
    inlineWorkboxRuntime: options.inlineWorkboxRuntime,
    minify: options.minify!,
    manifestEntries: [],
    target: useTargets,
    workboxRuntimeCompatible: options.workboxRuntimeCompatible!,
    generateSW: { swCode },
  })

  return await runBundlerBuild(
    count,
    size,
    warnings,
    builds,
    filePathsMap,
    tempFileWrites,
    prepareBuilds,
    tempFiles,
  )
}
