import type { GenerateSWOptions, SWType } from '../src/types'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES } from '../src/utils/constants'
import { AsyncGenerateSWOptionsSchema } from '../src/validation/async-generate-sw'
import { validateGenerateSW } from '../src/validation/validation-helper'

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
  it('default values', async () => {
    const swDest = path.relative(
      process.cwd(),
      path.resolve(import.meta.dirname, 'fixtures/fixture-generate-sw', 'sw.js'),
    ).replace(/\\/g, '/')
    const options = {
      globDirectory: path.resolve(import.meta.dirname, 'fixtures/fixture-generate-sw').replace(/\\/g, '/'),
      swDest,
    } satisfies GenerateSWOptions<SWType>
    await expect(validateGenerateSW(options)).resolves.toMatchObject({
      swDest,
      swType: 'classic',
      maximumFileSizeToCacheInBytes: DEFAULT_MAXIMUM_FILE_SIZE_TO_CACHE_IN_BYTES,
      throwMaximumFileSizeToCacheInBytes: true,
      globPatterns: ['**/*.{js,css,html}'],
      globIgnores: ['**/node_modules/**/*'],
    } satisfies GenerateSWOptions<SWType>)
  })
})
