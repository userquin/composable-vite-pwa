import type { InferOutput } from 'valibot'
import type { Bundler } from '../build/bundler/bundler-types'
import type { BuildGenerateSWOptions } from '../build/types'
import type { SWType } from '../types'
import { AsyncBuildSWOptionsSchema } from './async-build-sw'
import { validateAsync } from './validation-helper'

export async function validateBuildSW<
  T extends SWType,
  B extends Bundler,
  BundlerOptions extends BuildGenerateSWOptions<T, B>,
>(
  options: BundlerOptions,
): Promise<InferOutput<typeof AsyncBuildSWOptionsSchema>> {
  return await validateAsync(AsyncBuildSWOptionsSchema, options, 'buildSW')
}
