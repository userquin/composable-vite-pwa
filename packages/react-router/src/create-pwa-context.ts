import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { BuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/vite/index'
import type {
  BasePartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Preset } from '@react-router/dev/config'
import type { HookHandler, Plugin } from 'vite'
import type { ReactRouterPWAOptions } from './types'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import pc from 'picocolors'

export interface ReactRouterPluginContext {
  __reactRouterPluginContext: {
    reactRouterConfig: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig']
  }
}

export type ReactRouterPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<'vite', UserStrategy, T> & {
  reactRouter: {
    ssrRuntimeInfo: boolean
    /**
     * The ReactRouter plugin context.
     */
    context: ReactRouterPluginContext
    /**
     * Resolves the ReactRouter config.
     */
    reactRouterConfig: () => Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig']
    /**
     * Callback from the build end preset hook.
     * @param reactRouterConfig The resolved ReactRouter config from the preset build end hook.
     */
    runBuildForPresetBuild: (reactRouterConfig: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig']) => Promise<void>
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
  reactRouterPlugin: ReturnType<typeof import('@react-router/dev/vite')['reactRouter']>,
  options: Partial<ReactRouterPWAOptions<UserStrategy, T>>,
): ReactRouterPWAContext<UserStrategy, T> {
  // rr pwa doesn't support inject register
  options.injectRegister = false

  const { ssrRuntimeInfo = false, ...pwaOptions } = options

  const ctx = Object.assign(
    createVitePWAContext(true, pwaOptions),
    {
      hmrRequiresSwitcher: true,
      inspectorRequiresViteDevtools: true,
      reactRouter: {
        ssrRuntimeInfo,
        context: undefined!,
        reactRouterConfig: () => {
          if (!ctx.reactRouter.context) {
            throw new Error(
              `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Cannot find React Router plugin context!')}\n`,
            )
          }

          return ctx.reactRouter.context.__reactRouterPluginContext.reactRouterConfig
        },
        runBuildForPresetBuild: (
          reactRouterConfig: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig'],
        ) => runPresetBuild(
          ctx,
          reactRouterConfig,
        ),
      },
    },
  ) as ReactRouterPWAContext<UserStrategy, T>

  for (const p of reactRouterPlugin) {
    if (p.name === 'react-router') {
      const rrPluginConfig = p.config as import('vite').Plugin['config']
      if (!rrPluginConfig) {
        break
      }
      hijackHook(p, 'config', async (fn, pluginContext, args) => {
        const result = await fn.apply(pluginContext, args)
        if (result && '__reactRouterPluginContext' in result) {
          ctx.reactRouter.context = result as ReactRouterPluginContext
        }
        return result
      })
      break
    }
  }

  ctx.configurePWAOptions = async () => {
    switch (ctx.strategy) {
      case 'generate-sw':
        ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
        break
      case 'inject-manifest':
        ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
        break
      case 'build-sw':
        ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
        await addBuildPlugin(
          ctx,
          ctx.resolvedOptions.buildSW as import('@composable-vite-pwa/workbox-build/build/vite/types').BuildServiceWorkerOptions<any>,
        )
        break
    }

    return undefined
  }

  return ctx
}

async function runPresetBuild(
  ctx: ReactRouterPWAContext<any, any>,
  reactRouterConfig: Parameters<NonNullable<Preset['reactRouterConfigResolved']>>['0']['reactRouterConfig'],
) {
  if (ctx.resolvedOptions.disable) {
    return
  }

  if (ctx.reactRouter.context) {
    ctx.reactRouter.context.__reactRouterPluginContext.reactRouterConfig = reactRouterConfig
  }
  else {
    ctx.reactRouter.context = {
      __reactRouterPluginContext: { reactRouterConfig },
    }
  }
  ctx.base = reactRouterConfig.basename
  ctx.resolvedOptions.base = reactRouterConfig.basename
  ctx.resolvedOptions.buildBase = reactRouterConfig.basename
  ctx.resolvedOptions.scope = reactRouterConfig.basename
  ctx.outDir = `${reactRouterConfig.buildDirectory}/client`
  ctx.resolvedOptions.outDir = ctx.outDir
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
    if (reactRouterConfig.ssr) {
      options.manifestTransforms ??= []
      // todo: add trailing slash support, check reactRouterConfig.future and how to access it
      options.manifestTransforms.unshift((manifestEntries) => {
        const regexp = /\.html$/
        let base = ctx.resolvedOptions.base || '/'
        if (!base.endsWith('/')) {
          base += '/'
        }
        for (const e of manifestEntries) {
          const url = e.url?.startsWith('/') ? e.url.slice(1) : e.url
          if (url === 'index.html') {
            e.url = base
          }
          else if (url.endsWith('.html')) {
            e.url = `${base}${url.replace(regexp, '')}`
          }
        }

        return { manifest: manifestEntries, warnings: [] }
      })
    }
    Object.assign(options, {
      globDirectory: ctx.outDir,
    })

    options.swDest = `${ctx.outDir}/${swName}`
  }

  await ctx.runBuild()
}

async function addBuildPlugin(
  ctx: ReactRouterPWAContext<any, any>,
  buildSW: BuildServiceWorkerOptions<any>,
) {
  const consumerPlugins = buildSW.plugins
  const swPlugin = await import('./plugins/runtime/sw').then(({ SWPlugin }) => SWPlugin(ctx))
  buildSW.plugins = (swType) => {
    const plugins = consumerPlugins?.(swType) ?? []
    plugins.unshift(swPlugin)
    return plugins
  }

  return buildSW
}

type AnyFn = (...args: any) => any
type AsFn<T> = T extends AnyFn ? T : AnyFn
type PluginHookFn<K extends keyof Plugin> = AsFn<NonNullable<HookHandler<Plugin[K]>>>

type HookWrapper<K extends keyof Plugin> = (
  fn: PluginHookFn<K>,
  context: ThisParameterType<PluginHookFn<K>>,
  args: NonNullable<Parameters<PluginHookFn<K>>>,
  order: string,
) => ReturnType<PluginHookFn<K>>

function hijackHook<K extends keyof Plugin>(plugin: Plugin, name: K, wrapper: HookWrapper<K>) {
  if (!plugin[name])
    return

  // @ts-expect-error future
  let order = plugin.order || plugin.enforce || 'normal'

  const hook = plugin[name] as any
  if ('handler' in hook) {
    // rollup hook
    const oldFn = hook.handler
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.handler = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else if ('transform' in hook) {
    // transformIndexHTML
    const oldFn = hook.transform
    order += `-${hook.order || hook.enforce || 'normal'}`
    hook.transform = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
  else {
    // vite hook
    const oldFn = hook
    plugin[name] = function (this: any, ...args: any) {
      return wrapper(oldFn, this, args, order)
    }
  }
}
