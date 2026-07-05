import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type {
  BasePartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
} from '@composable-vite-pwa/workbox-build/types'
import type {
  Preset,
} from '@react-router/dev/config'
import type { ReactRouterPWAContext } from './create-pwa-context'
import { lookupReactRouterPWAContext } from './plugins/api'

export function ReactRouterPWAPreset(): Preset {
  return {
    name: 'vite-pwa:react-router: preset',
    reactRouterConfig: () => {
      return {
        buildEnd: async ({
          reactRouterConfig,
          viteConfig,
        }) => {
          const ctx = lookupReactRouterPWAContext(viteConfig)
          if (!ctx) {
            throw new Error('Cannot find ReactRouterPWAContext context in the resolved Vite configuration: missing ctx entry!')
          }
          if (!ctx.resolvedOptions.disable) {
            ctx.base = reactRouterConfig.basename
            ctx.resolvedOptions.base = reactRouterConfig.basename
            ctx.resolvedOptions.buildBase = reactRouterConfig.basename
            ctx.resolvedOptions.scope = reactRouterConfig.basename
            ctx.outDir = `${reactRouterConfig.buildDirectory}/client`
            ctx.resolvedOptions.outDir = ctx.outDir
            prepareSWBuild(ctx)
            await ctx.runBuild()
          }
        },
      }
    },
  }
}

function prepareSWBuild(
  ctx: ReactRouterPWAContext<any, any>,
) {
  const swName = ctx.consumerOptions.filename || 'sw.js'
  let options: Partial<BasePartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
      options = ctx.resolvedOptions.generateSW
      break
    case 'inject-manifest':
      ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
      options = ctx.resolvedOptions.injectManifest
      break
    case 'build-sw':
      ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
      options = ctx.resolvedOptions.buildSW
      break
  }

  if (options) {
    Object.assign(options, {
      globDirectory: ctx.outDir,
    })

    options.swDest = `${ctx.outDir}/${swName}`
  }
}
