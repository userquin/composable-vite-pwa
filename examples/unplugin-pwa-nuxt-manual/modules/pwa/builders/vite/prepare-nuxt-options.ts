import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
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
  S extends Strategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, S, T> | ViteLegacyNuxtPWAContext<UserStrategy, S, T>,
  nuxt: Nuxt,
) {
  if (nuxt.options.dev) {
    nuxt.hook('vite:serverCreated', async (viteServer, { isServer }) => {
      if (isServer) {
        return
      }
      // @ts-expect-error just ignore
      const emptyHandle = (_req, _res, next) => {
        next()
      }
      const swNames = ctx.pwaCtx.dev.options.swNames
      if (swNames.hasNames) {
        if (ctx.pwaCtx.resolvedOptions.swType === 'classic-and-module') {
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}.map`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}.map`, handle: emptyHandle })
        }
        else {
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}.map`, handle: emptyHandle })
        }
      }
    })
  }

  addVitePlugin([
    MainPlugin(ctx.pwaCtx),
    InfoPlugin(ctx.pwaCtx),
    DevPlugin(ctx.pwaCtx),
    DevMiddlewarePlugin(ctx.pwaCtx),
    AssetsPlugin(ctx.pwaCtx),
    PwaRuntimeConfiguration(ctx),
  ] as Plugin[])
}
