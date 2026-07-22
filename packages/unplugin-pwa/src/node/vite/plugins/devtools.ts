import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type {
  ViteBundler,
  VitePWAPluginContext,
} from '../vite-context'
import { fileURLToPath } from 'node:url'
import packageJson from '../../../../package.json' with { type: 'json' }
import {
  INSPECTOR_BASE_PATH,
  INSPECTOR_BASE_PATH_URL,
} from '../../constants'
import { inspectorWithInjectManifestWarning } from '../../logs'

export function DevtoolsPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  const defer = createDefer<boolean>()
  ctx.hooks.hook('context:ready', (e) => {
    if (e) {
      defer.resolve(false)
    }
    else {
      defer.resolve(ctx.devEnvironment && ctx.bundler === 'vite' && ctx.resolvedOptions.devOptions?.inspector === 'vite-devtools')
    }
  })

  return {
    name: 'unplugin-pwa:vite:devtools',
    devtools: {
      capabilities: {
        dev: {
          rpc: true,
          views: true,
        },
        build: {
          rpc: false,
          views: false,
        },
      },
      async setup(context) {
        let install = false
        try {
          install = await defer
        }
        catch {
          return
        }

        if (!install) {
          return
        }

        const clientDist = fileURLToPath(new URL('../../../inspector', import.meta.url))

        // since the SW is "static" there is no way to bypass the navigation fallback,
        // and so we need to disable it
        if (ctx.strategy === 'inject-manifest') {
          console.warn(inspectorWithInjectManifestWarning)
        }

        // Host the static files
        context.views.hostStatic(INSPECTOR_BASE_PATH, clientDist)

        // Register the dock entry
        context.docks.register({
          id: 'unplugin-pwa:inspector',
          title: 'Vite PWA Inspector',
          icon: {
            light: `${INSPECTOR_BASE_PATH}/icon_light.svg`,
            dark: `${INSPECTOR_BASE_PATH}/icon_dark.svg`,
          },
          type: 'iframe',
          url: INSPECTOR_BASE_PATH_URL,
        })

        context.rpc.register({
          name: 'unplugin-pwa:pwa-configuration',
          type: 'action',
          handler: () => {
            const resolvedOptions = ctx.resolvedOptions
            const devOptions = resolvedOptions.devOptions
            return {
              version: packageJson.version,
              base: ctx.base,
              swEnabled: ctx.resolvedOptions.disable === false,
              strategy: ctx.strategy,
              swType: resolvedOptions.swType,
              swDevEnabled: devOptions?.enabled === true,
              currentSWType: ctx.dev.options.swType,
              swNames: ctx.dev.options.swNames,
              manifest: resolvedOptions.manifest,
            }
          },
        })

        context.rpc.register({
          name: 'unplugin-pwa:service-worker-info',
          type: 'action',
          handler: () => {
            const devOptions = ctx.resolvedOptions.devOptions
            const dependencies = devOptions?.enabled === true && ctx.dev.options?.swAssetKeys
              ? [...ctx.dev.options.swAssetKeys].filter(d => !d.endsWith('.map'))
              : undefined
            return {
              swType: devOptions?.enabled === true ? ctx.dev.options?.swType : undefined,
              dependencies,
            }
          },
        })
      },
    },
  } as PluginWithDevTools
}

type DeferPromise<T> = Promise<T> & {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

function createDefer<T>(): DeferPromise<T> {
  let resolve: ((value: T | PromiseLike<T>) => void) | null = null
  let reject: ((reason?: any) => void) | null = null

  const p = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  }) as DeferPromise<T>

  p.resolve = resolve!
  p.reject = reject!
  return p
}
