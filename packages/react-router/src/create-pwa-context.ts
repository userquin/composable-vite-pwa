import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  BasePartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Preset } from '@react-router/dev/config'
import type { ResolvedConfig } from 'vite'
import type { ReactRouterPWAOptions } from './types'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import packageJSON from '../package.json' with { type: 'json' }

export interface ReactRouterPWASWContext {
  version: string
  enablePrecaching: boolean
  navigateFallback?: string
  clientsClaimMode: 'auto' | boolean
  cleanupOutdatedCaches: boolean
  promptForUpdate: boolean
}

export type ReactRouterPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<'vite', UserStrategy, T> & {
  reactRouter: {
    sw: ReactRouterPWASWContext
    context: ReactRouterContext['__reactRouterPluginContext']
    lookupContext: () => ReactRouterContext['__reactRouterPluginContext']
  }
}

export type ReactRouterContext = ResolvedConfig & {
  __reactRouterPluginContext: {
    reactRouterConfig: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig']
    publicPath: string
    rootDirectory: string
    entryClientFilePath: string
    entryServerFilePath: string
    viteManifestEnabled: boolean
    isSsrBuild: boolean
  }
}

export interface ReactRouterPWAApi<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> {
  ctx: ReactRouterPWAContext<UserStrategy, T>
}

export function createReactRouterPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<ReactRouterPWAOptions<UserStrategy, T>>,
): ReactRouterPWAContext<UserStrategy, T> {
  const ctx = Object.assign(
    createVitePWAContext(true, options),
    {
      hmrRequiresSwitcher: true,
      reactRouter: {
        sw: undefined!,
        context: undefined!,
        lookupContext: () => {
          if (!ctx.reactRouter.context) {
            if ('__reactRouterPluginContext' in ctx.resolvedOptions) {
              const context = ctx.resolvedOptions as ReactRouterContext
              ctx.reactRouter.context = context.__reactRouterPluginContext
            }
          }

          return ctx.reactRouter.context
        },
      },
    },
  ) as ReactRouterPWAContext<UserStrategy, T>

  ctx.configurePWAOptions = () => {
    const { swOptions } = (ctx.consumerOptions ?? {}) as ReactRouterPWAOptions<any, any>
    const { buildSW } = swOptions ?? {}
    let options: Partial<BasePartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
    let clientsClaimMode = false
    let cleanupOutdatedCaches = false
    let enablePrecaching = false

    switch (ctx.strategy) {
      case 'generate-sw':
        ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
        options = ctx.resolvedOptions.generateSW
        clientsClaimMode = ctx.resolvedOptions.generateSW!.clientsClaim === true
        cleanupOutdatedCaches = ctx.resolvedOptions.generateSW!.cleanupOutdatedCaches === true
        enablePrecaching = true
        break
      case 'inject-manifest':
        ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
        options = ctx.resolvedOptions.injectManifest
        enablePrecaching = ctx.resolvedOptions.injectManifest!.injectionPoint !== undefined
        break
      case 'build-sw':
        ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
        options = ctx.resolvedOptions.buildSW
        enablePrecaching = ctx.resolvedOptions.buildSW!.injectionPoint !== undefined
        break
    }
    const promptForUpdate = ctx.resolvedOptions.registerType !== 'autoUpdate'
    if (options) {
      ctx.reactRouter.sw = {
        version: packageJSON.version,
        enablePrecaching,
        // navigateFallback?: string
        clientsClaimMode,
        cleanupOutdatedCaches,
        promptForUpdate,
      }
    }
    else {
      ctx.reactRouter.sw = {
        version: packageJSON.version,
        enablePrecaching,
        // navigateFallback?: string
        clientsClaimMode,
        cleanupOutdatedCaches,
        promptForUpdate,
      }
    }

    return undefined
  }

  return ctx
}
