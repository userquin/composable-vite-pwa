import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from './internal-types'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { addVitePlugin } from '@nuxt/kit'
import { PwaRuntimeConfiguration } from './plugins/pwa-runtime-configuration'

export async function prepareNuxtOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, T> | ViteLegacyNuxtPWAContext<UserStrategy, T>,
  nuxt: Nuxt,
) {
  if (nuxt.options.dev) {
    const prefix = `${ctx.base}__skip_vite/`
    ctx.normalizeDevServiceWorkerId = (
      hook,
      depType,
      id,
    ) => {
      const useId = id.startsWith(prefix) ? id.slice(prefix.length - 1) : id
      if (depType === 'sw') {
        return [useId.startsWith('/') ? useId.slice(1) : useId, useId]
      }

      if (hook === 'load') {
        return [useId, useId]
      }

      const assetId = useId.startsWith('./') ? useId.slice(1) : useId
      return [assetId, assetId]
    }

    const swNames = ctx.dev.options.swNames
    if (swNames.hasNames) {
      nuxt.hook('vite:serverCreated', async (viteServer, { isServer }) => {
        if (isServer) {
          return
        }

        // @ts-expect-error just ignore
        const emptyHandle = (_req, _res, next) => {
          next()
        }

        if (ctx.resolvedOptions.swType === 'classic-and-module') {
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.classic}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.classic}.map`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.module}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.module}.map`, handle: emptyHandle })
          // }
        }
        else {
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.name}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.base}${swNames.name}.map`, handle: emptyHandle })
        }
      })
    }
  }

  addVitePlugin([
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    PwaRuntimeConfiguration(ctx),
  ] as Plugin[])
}
