import { describe, expect, it } from 'vitest'
import { AsyncGetManifestOptionsSchema } from '../src/validation/async-get-manifest'

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
})
