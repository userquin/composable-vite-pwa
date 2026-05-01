import { describe, expect, it } from 'vitest'
import { AsyncInjectManifestOptionsSchema } from '../src/validation/async-inject-manifest'

describe('inject-manifest validations', () => {
  const objectSchema = AsyncInjectManifestOptionsSchema.pipe[0]
  const entries = objectSchema.entries
  const allFields = Object.entries(entries)
  const requiredFields = allFields.filter((entry) => {
    return entry[1].type !== 'optional'
  }).map(([key]) => key)
  it('required fields', () => {
    expect(requiredFields).toEqual(['swSrc', 'swDest', 'globDirectory'])
  })
})
