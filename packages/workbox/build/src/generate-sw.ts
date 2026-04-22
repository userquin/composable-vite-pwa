import type { GenerateSWOptions } from './types'
import { deepMergeObject } from 'magicast/helpers'
import serialize from 'serialize-javascript'

export async function generateSW(options: GenerateSWOptions): Promise<void> {
  const [prepareSWCode, validateGenerateSW] = await Promise.all([
    import('./utils/prepare-sw-code').then(({ prepareSWCode }) => prepareSWCode),
    import('./validation/validation-helper').then(({ validateGenerateSW }) => validateGenerateSW),
  ])

  const optionsWithDefaults = await validateGenerateSW(options)

  console.log(serialize(optionsWithDefaults, { unsafe: true }))

  deepMergeObject(options, optionsWithDefaults)

  console.log(serialize(options, { unsafe: true }))

  console.log(await prepareSWCode(options))
}
