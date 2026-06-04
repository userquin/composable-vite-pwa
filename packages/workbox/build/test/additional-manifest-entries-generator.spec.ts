import { describe, it, expect } from 'vitest'
import { generateManifestEntries } from '../src/utils/generate-manifest-entries'
import { generateSWFixture } from './test-helper'

describe('additionalManifestEntriesGenerator', () => {
  it('should yield entries that appear in the final manifest', async () => {
    const result = await generateManifestEntries(
      {
        globPatterns: ['**/*.js'],
        additionalManifestEntriesGenerator: (async function* () {
          yield { url: '/generated-1.js', revision: 'abc123' }
          yield { url: '/generated-2.js', revision: 'def456' }
        })(),
      },
      generateSWFixture,
    )

    expect(result.manifestEntries).toContainEqual(
      expect.objectContaining({ url: '/generated-1.js', revision: 'abc123' }),
    )
    expect(result.manifestEntries).toContainEqual(
      expect.objectContaining({ url: '/generated-2.js', revision: 'def456' }),
    )
  })
})
