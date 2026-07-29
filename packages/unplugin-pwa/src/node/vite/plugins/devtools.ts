import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginWithDevTools } from '@vitejs/devtools-kit'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type {
  ViteBundler,
  VitePWAPluginContext,
} from '../vite-context'
import { fileURLToPath } from 'node:url'
import {
  INSPECTOR_BASE_PATH,
  INSPECTOR_BASE_PATH_URL,
} from '../../constants'
import {
  preparePWAConfigurationData,
  prepareServiceWorkerData,
} from '../../inspector-utils'
import { inspectorWithInjectManifestWarning } from '../../logs'

export function DevtoolsPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  const defer = createDefer<boolean>()
  ctx.hooks.hook('context:ready', (e) => {
    console.log('calling context:ready')
    if (e) {
      defer.resolve(false)
    }
    else {
      defer.resolve(ctx.devEnvironment && ctx.bundler === 'vite' && ctx.resolvedOptions.devOptions?.inspector === 'vite-devtools')
    }
  })

  return {
    name: 'unplugin-pwa:vite:devtools',
    apply: 'serve',
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
          handler: () => preparePWAConfigurationData(ctx),
        })

        context.rpc.register({
          name: 'unplugin-pwa:service-worker-info',
          type: 'action',
          handler: () => prepareServiceWorkerData(ctx),
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
