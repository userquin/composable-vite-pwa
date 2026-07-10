import type { Preset } from '@react-router/dev/config'
import { lookupReactRouterPWAContext } from './plugins/node/api'

export function ReactRouterPWAPreset(): Preset {
  return {
    name: 'vite-pwa:react-router:preset',
    reactRouterConfig: () => {
      return {
        buildEnd: async ({
          reactRouterConfig,
          viteConfig,
        }) => {
          const ctx = lookupReactRouterPWAContext(viteConfig)
          if (!ctx) {
            throw new Error('Cannot find ReactRouterPWAContext context in the resolved Vite configuration!')
          }
          await ctx.reactRouter.runBuildForPresetBuild(reactRouterConfig)
        },
      }
    },
  }
}
