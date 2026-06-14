import type { Strategy } from '../../../config/types'
import type { SWType } from '../../../types'
import type { VitePWAContext } from './plugin-context'

export function createApi<
  S extends Strategy,
  T extends SWType,
>(pluginContext: VitePWAContext<S, T>) {
  return {
    generateSW: async (options: import('../../types').BuildGenerateSWOptions<T>) => {
      if (!pluginContext.isDev) {
        return
      }
      const { strategy } = await pluginContext.resolvedOptions
      if (!strategy || strategy !== 'generate-sw') {
        return
      }
      const { vite } = await pluginContext.detectionResult
      if (vite) {
        await import('../generate-sw').then(({
          generateSW,
        }) => generateSW(
          options,
        ))
      }
      else {
        await import('../legacy-generate-sw').then(({
          generateSWLegacy,
        }) => generateSWLegacy(
          options,
        ))
      }
    },
    injectManifest: async (options: import('../../../config/types').InjectManifestStrategyOptions) => {
      if (!pluginContext.isDev) {
        return
      }
      const { strategy } = await pluginContext.resolvedOptions
      if (!strategy || strategy !== 'inject-manifest') {
        return
      }
      await import('../../../inject-manifest').then(({
        injectManifest,
      }) => injectManifest(
        options,
      ))
    },
  }
}
