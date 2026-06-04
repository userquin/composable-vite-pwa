import { describe, expect, it } from 'vitest'
import { generateManifestEntries } from '../src/utils/generate-manifest-entries'
import { generateSWFixture } from './test-helper'

describe('failOnDuplicateManifestEntries', () => {
  it('should throw an error listing duplicates when true', async () => {
    await expect(generateManifestEntries(
      {
        globPatterns: ['**/*.js'],
        additionalManifestEntries: [{ url: '/duplicate.js', revision: 'static' }],
        additionalManifestEntriesGenerator: (async function* () {
          yield { url: '/duplicate.js', revision: 'generator' }
          yield { url: '/unique.js', revision: 'unique' }
        })(),
        failOnDuplicateManifestEntries: true,
      },
      generateSWFixture,
    )).rejects.toThrow(/Duplicate precache entries found:\n {2}- \/duplicate.js/)
  })

  it('should allow duplicates when failOnDuplicateManifestEntries is false (default)', async () => {
    const result = await generateManifestEntries(
      {
        globPatterns: ['**/*.js'],
        additionalManifestEntries: [{ url: '/duplicate.js', revision: 'static' }],
        additionalManifestEntriesGenerator: (async function* () {
          yield { url: '/duplicate.js', revision: 'generator' }
        })(),
        failOnDuplicateManifestEntries: false,
      },
      generateSWFixture,
    )

    const duplicateEntries = result.manifestEntries.filter(e => e.url === '/duplicate.js')
    expect(duplicateEntries).toHaveLength(2)
    expect(duplicateEntries).toContainEqual(expect.objectContaining({ revision: 'static' }))
    expect(duplicateEntries).toContainEqual(expect.objectContaining({ revision: 'generator' }))
  })
})
