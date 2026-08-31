import type { Preset } from '@react-router/dev/config'
import pc from 'picocolors'
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
          // @ts-expect-error TS2345: Argument of type multiple vite versions
          const ctx = lookupReactRouterPWAContext(viteConfig)
          if (!ctx) {
            throw new Error(
              `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Cannot find ReactRouterPWAContext context in the resolved Vite configuration!')}\n`,
            )
          }
          await ctx.reactRouter.runBuildForPresetBuild(reactRouterConfig)
        },
      }
    },
  }
}
