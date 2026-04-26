import type { GenerateSWOptions, GetManifestResult } from './types'

export async function generateSW(options: GenerateSWOptions): Promise<GetManifestResult> {
  const [
    deepMergeObject,
    prepareSWCode,
    validateGenerateSW,
  ] = await Promise.all([
    import('magicast/helpers').then(({ deepMergeObject }) => deepMergeObject),
    import('./utils/prepare-sw-code').then(({ prepareSWCode }) => prepareSWCode),
    import('./validation/validation-helper').then(({ validateGenerateSW }) => validateGenerateSW),
  ])

  const optionsWithDefaults = await validateGenerateSW(options)

  deepMergeObject(options, optionsWithDefaults)

  const { swCode, ...result } = await prepareSWCode(options)

  console.log(result)

  console.log(swCode)

  return result
}
