import type { GenerateSWOptions, SWType } from '../src/types'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES } from '../src/utils/constants'
import { AsyncGenerateSWOptionsSchema } from '../src/validation/async-generate-sw'
import { validateGenerateSW } from '../src/validation/validation-helper'
import { createGenerateSWOptions, withDummyRuntimeCaching } from './test-helper'

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

  const swTypeAndRequiredFields = swTypes.flatMap(swType =>
    requiredFields.map(field => ({ swType, field })),
  )

  it.each(swTypeAndRequiredFields)(
    'missing required field "$field" fails for $swType',
    async ({ swType, field }) => {
      const { options } = createGenerateSWOptions(swType)

      // @ts-expect-error forcing validation failure
      options[field] = undefined

      await expect(validateGenerateSW(options)).rejects.toThrow(
        new RegExp(`The '${field}' option is required`),
      )
    },
  )

  it.each(swTypeAndRequiredFields)(
    'invalid type for required field "$field" fails for $swType',
    async ({ swType, field }) => {
      const { options } = createGenerateSWOptions(swType)
      // @ts-expect-error forcing type failure
      options[field] = () => {}
      await expect(validateGenerateSW(options)).rejects.toThrow(
        new RegExp(`The '${field}' option is required`),
      )
    },
  )

  it.each(swTypes)('default values are populated for %s', async (swType) => {
    const { globDirectory, options, swDest } = createGenerateSWOptions(swType)
    await expect(validateGenerateSW(options)).resolves.toMatchObject({
      swDest,
      swType,
      globDirectory,
      inlineWorkboxRuntime: false,
      maximumFileSizeToCacheInBytes: DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES,
      throwMaximumFileSizeToCacheInBytes: true,
      globPatterns: ['**/*.{js,css,html}'],
      globIgnores: ['**/node_modules/**/*'],
    } satisfies GenerateSWOptions<typeof swType>)
  })

  it.each(swTypes)('missing swDest folder fails for %s', async (swType) => {
    const { options } = createGenerateSWOptions(swType, true, {
      swDest: '__missing__/sw.js',
    })
    await expect(validateGenerateSW(options)).rejects.toThrow(
      /The 'swDest' value must be a valid path/,
    )
  })

  it.each(swTypes)('missing globDirectory and runtimeCaching fails for %s', async (swType) => {
    const { options } = createGenerateSWOptions(swType, false)
    await expect(validateGenerateSW(options)).rejects.toThrow(
      /Couldn't find configuration for either precaching or runtime caching/,
    )
  })
  it.each(swTypes)('missing globDirectory fails for %s', async (swType) => {
    const { options } = createGenerateSWOptions(swType, false, {
      globDirectory: '__missing__',
    })
    await expect(validateGenerateSW(options)).rejects.toThrow(
      /The path you entered isn't a valid directory/,
    )
  })

  it.each(swTypes)('missing globDirectory with a runtimeCaching does NOT fail for %s', async (swType) => {
    const { options: classicOptions } = withDummyRuntimeCaching(swType)
    await expect(validateGenerateSW(classicOptions)).resolves.not.toBeUndefined()
  })
})
