import type { GetManifestOptions } from '../src/types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES } from '../src/utils/constants'
import { AsyncGetManifestOptionsSchema } from '../src/validation/async-get-manifest'
import {
  validateGetManifest,
} from '../src/validation/validation-helper'

function generateSWOptions(
  options: Partial<GetManifestOptions> = {},
) {
  const globDirectory = path.relative(
    process.cwd(),
    path.resolve(import.meta.dirname, 'fixtures/fixture-generate-sw'),
  ).replace(/\\/g, '/')
  return {
    globDirectory,
    options: Object.assign(
      {},
      {
        globDirectory,
      },
      options,
    ) satisfies GetManifestOptions,
  }
}

describe('get-manifest validations', () => {
  const objectSchema = AsyncGetManifestOptionsSchema.pipe[0]
  const entries = objectSchema.entries
  const allFields = Object.entries(entries)
  const requiredFields = allFields.filter((entry) => {
    return entry[1].type !== 'optional'
  }).map(([key]) => key)
  it('required fields', () => {
    expect(requiredFields).toEqual(['globDirectory'])
  })
  const messages: Record<string, RegExp> = {
    globDirectory: /The supplied globDirectory must be a path as a string/,
  }

  it.each(requiredFields)('missing %s option fails', async (field) => {
    const { options } = generateSWOptions()
    // @ts-expect-error this is the desired test
    options[field] = undefined
    expect(messages[field]).not.toBeUndefined()
    await expect(validateGetManifest(options)).rejects.toThrow(messages[field])
  })

  it.each(requiredFields)('invalid %s option type fails', async (field) => {
    const { options } = generateSWOptions()
    // @ts-expect-error this is the desired test
    options[field] = () => {}
    expect(messages[field]).not.toBeUndefined()
    await expect(validateGetManifest(options)).rejects.toThrow(messages[field])
  })

  it('default values are populated', async () => {
    const { globDirectory, options } = generateSWOptions()
    await expect(validateGetManifest(options)).resolves.toMatchObject({
      globDirectory,
      maximumFileSizeToCacheInBytes: DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES,
      throwMaximumFileSizeToCacheInBytes: true,
      globPatterns: ['**/*.{js,css,html}'],
      globIgnores: ['**/node_modules/**/*'],
    } satisfies GetManifestOptions)
  })

  it('missing globDirectory fails', async () => {
    const { options } = generateSWOptions({
      globDirectory: '__missing__',
    })
    await expect(validateGetManifest(options)).rejects.toThrow(
      /The path you entered isn't a valid directory/,
    )
  })
})
