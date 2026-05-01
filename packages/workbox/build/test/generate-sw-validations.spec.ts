import type { GenerateSWOptions, SWType } from '../src/types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES } from '../src/utils/constants'
import { AsyncGenerateSWOptionsSchema } from '../src/validation/async-generate-sw'
import { validateGenerateSW } from '../src/validation/validation-helper'

function generateSWOptions<T extends SWType>(
  swType: T,
  withGlobDirectory = true,
  options: Partial<GenerateSWOptions<T>> = {},
) {
  const swDest = path.relative(
    process.cwd(),
    path.resolve(import.meta.dirname, 'fixtures/fixture-generate-sw', 'sw.js'),
  ).replace(/\\/g, '/')
  return {
    swDest,
    options: Object.assign(
      {},
      {
        swType,
        globDirectory: withGlobDirectory
          ? path.resolve(import.meta.dirname, 'fixtures/fixture-generate-sw').replace(/\\/g, '/')
          : undefined,
        swDest,
      },
      options,
    ) satisfies GenerateSWOptions<T>,
  }
}

function withDummyRuntimeCaching<T extends SWType>(
  swType: T,
  withGlobDirectory = false,
  options: Partial<GenerateSWOptions<T>> = {},
) {
  const data = generateSWOptions(swType, withGlobDirectory, options)
  data.options.runtimeCaching = [{
    handler: 'NetworkOnly',
    method: 'GET',
    urlPattern: /.*/,
  }]
  return data
}

describe('generate-sw validations', () => {
  const objectSchema = AsyncGenerateSWOptionsSchema.pipe[0]
  const entries = objectSchema.entries
  const allFields = Object.entries(entries)
  const requiredFields = allFields.filter((entry) => {
    return entry[1].type !== 'optional'
  }).map(([key]) => key)
  it('required fields', () => {
    expect(requiredFields).toEqual(['swDest'])
  })

  const swTypes: SWType[] = ['classic', 'module', 'classic-and-module']

  it.each(swTypes)('default values are populated for %s', async (swType) => {
    const { swDest, options } = generateSWOptions(swType)
    await expect(validateGenerateSW(options)).resolves.toMatchObject({
      swDest,
      swType,
      maximumFileSizeToCacheInBytes: DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES,
      throwMaximumFileSizeToCacheInBytes: true,
      globPatterns: ['**/*.{js,css,html}'],
      globIgnores: ['**/node_modules/**/*'],
    })
  })

  it.each(swTypes)('missing swDest folder fails for %s', async (swType) => {
    const { options } = generateSWOptions(swType, true, {
      swDest: '__missing__/sw.js',
    })
    await expect(validateGenerateSW(options)).rejects.toThrow(
      /The 'swDest' value must be a valid path/,
    )
  })

  it.each(swTypes)('missing globDirectory and runtimeCaching fails for %s', async (swType) => {
    const { options } = generateSWOptions(swType, false)
    await expect(validateGenerateSW(options)).rejects.toThrow(
      /Couldn't find configuration for either precaching or runtime caching/,
    )
  })

  it.each(swTypes)('missing globDirectory with a runtimeCaching does NOT fail for %s', async (swType) => {
    const { options: classicOptions } = withDummyRuntimeCaching(swType)
    await expect(validateGenerateSW(classicOptions)).resolves.not.toBeUndefined()
  })
})
