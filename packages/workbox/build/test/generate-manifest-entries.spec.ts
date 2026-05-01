import { deepMergeObject } from 'magicast/helpers'
import { describe, expect, it } from 'vitest'
import { generateManifestEntries } from '../src/utils/generate-manifest-entries'
import { validateGetManifest } from '../src/validation/validation-helper'
import { createGetManifestOptions, generateSWFixture, injectManifestFixture } from './test-helper'
/*
import type {
  GenerateSWOptions,
  GetManifestOptions,
  InjectManifestOptions,
} from '../src/types'
import { validateGenerateSW, validateGetManifest } from '../src/validation/validation-helper'
import { createGenerateSWOptions, createGetManifestOptions } from './test-helper'
*/

describe('generate-manifest-entries results', () => {
  describe('get-manifest', () => {
    it ('generates valid manifest entries', async () => {
      const options = createGetManifestOptions({
        globDirectory: generateSWFixture,
        globPatterns: ['**/*.{js,html}'],
      })
      const validatedOptions = await validateGetManifest(options.options)
      deepMergeObject(options.options, validatedOptions)
      let promise = generateManifestEntries(
        options.options,
        options.globDirectory,
      )
      await expect(promise).resolves.not.toThrow()
      let entries = await promise
      expect(entries.manifestEntries.length).toBeGreaterThan(0)
      options.globDirectory = injectManifestFixture
      promise = generateManifestEntries(
        options.options,
        options.globDirectory,
      )
      await expect(promise).resolves.not.toThrow()
      entries = await promise
      expect(entries.manifestEntries.length).toBeGreaterThan(0)
    })
  })
})
