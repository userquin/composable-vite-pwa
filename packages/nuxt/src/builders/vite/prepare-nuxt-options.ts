import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { Plugin } from 'vite'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from './internal-types'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevtoolsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/devtools'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { InspectorPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/inspector'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { /* addDevServerHandler, */addVitePlugin } from '@nuxt/kit'
import { PwaRuntimeConfiguration } from './plugins/pwa-runtime-configuration'

export async function prepareNuxtOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, T> | ViteLegacyNuxtPWAContext<UserStrategy, T>,
  nuxt: Nuxt,
) {
  if (nuxt.options.dev && ctx.resolvedOptions.devOptions!.enabled) {
    const prefix = `${ctx.base}__skip_vite/`
    let buildAssetsDir = nuxt.options.app.buildAssetsDir ?? '_nuxt/'
    if (buildAssetsDir[0] === '/') {
      buildAssetsDir = buildAssetsDir.slice(1)
    }
    if (buildAssetsDir[buildAssetsDir.length - 1] === '/') {
      buildAssetsDir = buildAssetsDir.slice(0, buildAssetsDir.length - 1)
    }
    buildAssetsDir = `${ctx.base}${buildAssetsDir}`
    // we don't know sw deps names, only sw names
    // unplugin-pwa dev middleware receiving /_nuxt/workbox-classic-xxxx.js.map
    ctx.dev.options.mapSWSourcemapFile = (url) => {
      if (!url.startsWith(buildAssetsDir)) {
        return undefined
      }
      return url.slice(buildAssetsDir.length)
    }
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
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.classic}`,
            handle: emptyHandle,
          })
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.classic}.map`,
            handle: emptyHandle,
          })
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.module}`,
            handle: emptyHandle,
          })
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.module}.map`,
            handle: emptyHandle,
          })
          // }
        }
        else {
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.name}`,
            handle: emptyHandle,
          })
          viteServer.middlewares.stack.push({
            route: `${ctx.base}${swNames.name}.map`,
            handle: emptyHandle,
          })
        }
      })
    }

    // TODO: remove once tested with nuxt 3
    // remove vue router warnings when requesting sourcemap files
    /* let sourcemapEnabled = false
    switch (ctx.strategy) {
      case 'build-sw': {
        const buildSW = ctx.resolvedOptions.buildSW!
        sourcemapEnabled = buildSW.sourcemap === true || buildSW.sourcemap === 'hidden'
        break
      }
      case 'generate-sw': {
        const generateSW = ctx.resolvedOptions.generateSW!
        sourcemapEnabled = generateSW.sourcemap === true || generateSW.sourcemap === 'hidden'
        break
      }
    }
     if (sourcemapEnabled) {
      let buildAssetsDir = nuxt.options.app.buildAssetsDir ?? '_nuxt/'
      if (buildAssetsDir[0] === '/') {
        buildAssetsDir = buildAssetsDir.slice(1)
      }
      if (buildAssetsDir[buildAssetsDir.length - 1] !== '/') {
        buildAssetsDir += '/'
      }
      addDevServerHandler({
        route: `${buildAssetsDir}*.js.map`,
        handler: await import('h3').then(({ defineLazyEventHandler }) => defineLazyEventHandler(async () => {
          const { devEventHandlerSourcemap } = await import('../../dev-event-handler-sourcemap')
          return devEventHandlerSourcemap(ctx)
        })),
      })
    } */
  }

  // @ts-expect-error no idea why cannot infer proper plugin types
  addVitePlugin([
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    PwaRuntimeConfiguration(ctx),
    InspectorPlugin(ctx),
    nuxt.options.dev && ctx.resolvedOptions.devOptions?.inspector === 'vite-devtools'
      ? DevtoolsPlugin(ctx)
      : undefined,
  ].filter(Boolean) as Plugin[])
}
