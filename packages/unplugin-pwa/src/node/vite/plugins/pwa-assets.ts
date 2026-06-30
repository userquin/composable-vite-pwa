import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { exactRegex } from '@rolldown/pluginutils'
import {
  DEV_PWA_ASSETS_NAME,
  DEV_READY_NAME,
  PWA_ASSETS_HEAD_VIRTUAL,
  PWA_ASSETS_ICONS_VIRTUAL,
  RESOLVED_PWA_ASSETS_HEAD_VIRTUAL,
  RESOLVED_PWA_ASSETS_ICONS_VIRTUAL,
} from '../../constants'
import { extractIcons } from '../../pwa-assets/utils'

/**
 * Vite plugin to generate virtual PWA assets modules.
 *
 * @param ctx The Vite PWA plugin context.
 */
export function AssetsPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  const transformHtml = async (html: string): Promise<string> => {
    if (!ctx.envApi && ctx.viteConfig.build.ssr) {
      return html
    }

    return await transformIndexHtmlHandler(html, ctx)
  }
  return <Plugin>{
    name: 'unplugin-pwa:pwa-assets',
    sharedDuringBuild: true,
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        return await transformHtml(html)
      },
      enforce: 'post',
      async transform(html: string) {
        return await transformHtml(html)
      },
    },
    resolveId: {
      filter: { id: [exactRegex(PWA_ASSETS_HEAD_VIRTUAL), exactRegex(PWA_ASSETS_ICONS_VIRTUAL)] },
      handler(id) {
        // condition is kept for backward compatibility for below Vite v6.3
        switch (true) {
          case id === PWA_ASSETS_HEAD_VIRTUAL:
            return RESOLVED_PWA_ASSETS_HEAD_VIRTUAL
          case id === PWA_ASSETS_ICONS_VIRTUAL:
            return RESOLVED_PWA_ASSETS_ICONS_VIRTUAL
          default:
            return undefined
        }
      },
    },
    load: {
      filter: { id: [exactRegex(RESOLVED_PWA_ASSETS_HEAD_VIRTUAL), exactRegex(RESOLVED_PWA_ASSETS_ICONS_VIRTUAL)] },
      async handler(id) {
        // conditions are kept for backward compatibility for below Vite v6.3
        if (id === RESOLVED_PWA_ASSETS_HEAD_VIRTUAL) {
          const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
          const head = pwaAssetsGenerator?.resolveHtmlAssets() ?? { links: [], themeColor: undefined }
          return `export const pwaAssetsHead = ${JSON.stringify(head)}`
        }
        if (id === RESOLVED_PWA_ASSETS_ICONS_VIRTUAL) {
          const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
          const icons = extractIcons(pwaAssetsGenerator?.instructions())
          return `export const pwaAssetsIcons = ${JSON.stringify(icons)}`
        }
      },
    },
    async handleHotUpdate({ file, server }) {
      const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
      if (await pwaAssetsGenerator?.checkHotUpdate(file)) {
        const modules: import('vite').ModuleNode[] = []
        const head = server.moduleGraph.getModuleById(RESOLVED_PWA_ASSETS_HEAD_VIRTUAL)
        head && modules.push(head)
        const icons = server.moduleGraph.getModuleById(RESOLVED_PWA_ASSETS_ICONS_VIRTUAL)
        icons && modules.push(icons)
        if (modules.length)
          return modules

        server.environments.client.hot.send({ type: 'full-reload' })
        return []
      }
    },
    configureServer(server) {
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }

      if (!ctx.envApi) {
        server.ws.on(DEV_READY_NAME, createWSResponseHandler(ctx, server))
        return
      }

      server.environments.client.hot.on(DEV_READY_NAME, createWSResponseHandler(ctx, server))
    },
  }
}

async function transformIndexHtmlHandler(
  html: string,
  ctx: VitePWAPluginContext<any, any, any>,
): Promise<string> {
  // dev: color-theme and icon links injected using createWSResponseHandler
  if (ctx.devEnvironment && ctx.resolvedOptions.devOptions?.enabled)
    return html

  const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
  if (!pwaAssetsGenerator)
    return html

  return pwaAssetsGenerator.transformIndexHtml(html)
}

function createWSResponseHandler(
  ctx: VitePWAPluginContext<any, any, any>,
  server: ViteDevServer,
): () => Promise<void> {
  return async () => {
    const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
    if (pwaAssetsGenerator) {
      const data = pwaAssetsGenerator.resolveHtmlAssets()
      if (!ctx.envApi) {
        server.ws.send({
          type: 'custom',
          event: DEV_PWA_ASSETS_NAME,
          data,
        })
        return
      }

      server.environments.client.hot.send({
        type: 'custom',
        event: DEV_PWA_ASSETS_NAME,
        data,
      })
    }
  }
}
