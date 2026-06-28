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
import semver from 'semver'
import { PwaRuntimeConfiguration } from './plugins/pwa-runtime-configuration'

export async function prepareNuxtOptions<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, S, T> | ViteLegacyNuxtPWAContext<UserStrategy, S, T>,
  nuxt: Nuxt,
) {
  const envApi = semver.major(ctx.nuxtVersion) >= 5 || (semver.major(ctx.nuxtVersion) === 4 && nuxt.options.experimental.viteEnvironmentApi === true)
  if (nuxt.options.dev) {
    console.log(envApi)
    // if (envApi) {
    const prefix = `${ctx.pwaCtx.base}__skip_vite/`
    ctx.pwaCtx.normalizeDevServiceWorkerId = (
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
    // }
    // else {
    //   ctx.pwaCtx.normalizeDevServiceWorkerId = defaultServiceWorkerAssetsNormalizer
    // }
    const swNames = ctx.pwaCtx.dev.options.swNames
    if (swNames.hasNames) {
      nuxt.hook('vite:serverCreated', async (viteServer, { isServer }) => {
        if (isServer) {
          return
        }
        ctx.pwaCtx.envApi = envApi

        // @ts-expect-error just ignore
        const emptyHandle = (_req, _res, next) => {
          next()
        }
        /* const prefix = `${ctx.pwaCtx.base}__skip_vite/`
        // @ts-expect-error just ignore
        const envApiEmptyHandle = (req, _res, next) => {
          req.url = req.url.slice(prefix.length)
          next()
        } */

        if (ctx.pwaCtx.resolvedOptions.swType === 'classic-and-module') {
          /* if (ctx.pwaCtx.envApi) {
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.classic}`, handle: envApiEmptyHandle })
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.classic}.map`, handle: envApiEmptyHandle })
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.module}`, handle: envApiEmptyHandle })
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.module}.map`, handle: envApiEmptyHandle })
          } */
          // else {
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}.map`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}.map`, handle: emptyHandle })
          // }
        }
        else {
          /* if (ctx.pwaCtx.envApi) {
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.name}`, handle: envApiEmptyHandle })
            viteServer.middlewares.stack.push({ route: `${prefix}${swNames.name}.map`, handle: envApiEmptyHandle })
          } */
          // else {
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}.map`, handle: emptyHandle })
          // }
        }
      })
      /* if (ctx.pwaCtx.envApi) {
        if (ctx.pwaCtx.resolvedOptions.swType === 'classic-and-module') {
          addDevServerHandler({
            route: `${ctx.pwaCtx.base}${swNames.classic}`,
            handle: emptyHandle,
          })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.classic}.map`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.module}.map`, handle: emptyHandle })
        }
        else {
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}`, handle: emptyHandle })
          viteServer.middlewares.stack.push({ route: `${ctx.pwaCtx.base}${swNames.name}.map`, handle: emptyHandle })
        }
      } */
    }
  }

  addVitePlugin([
    MainPlugin(ctx.pwaCtx),
    InfoPlugin(ctx.pwaCtx),
    DevPlugin(ctx.pwaCtx),
    DevMiddlewarePlugin(ctx.pwaCtx),
    AssetsPlugin(ctx.pwaCtx),
    PwaRuntimeConfiguration(envApi, ctx),
  ] as Plugin[])
}
