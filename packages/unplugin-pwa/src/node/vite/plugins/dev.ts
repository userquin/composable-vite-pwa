import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption, ViteDevServer } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import { exactRegex } from '@rolldown/pluginutils'
import {
  DEV_READY_NAME,
  DEV_REGISTER_SW_NAME,
  DEV_SW_NAME,
  DEV_SW_VIRTUAL,
  FILE_SW_REGISTER,
  RESOLVED_DEV_SW_VIRTUAL,
} from '../../constants'
import { injectWebManifestHtmlLink } from '../../inject-web-manifest-html-link'
import { createHmrScript } from '../dev/create-hmr-script'
import { injectHmrScript } from '../dev/inject-hmr-script'
import { prepareRegisterSw } from '../dev/prepare-register-sw'
import { prepareSwBuild } from '../dev/prepare-sw-build'

import { prepareSwNamesAndGlobDirectory } from '../dev/prepare-sw-names-and-glob-directory'

export function DevPlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): PluginOption {
  const transformHtml = (html: string): string => {
    if (!ctx.envApi && ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
      return html
    }

    html = injectWebManifestHtmlLink(html, ctx)

    return injectHmrScript(html, ctx.resolvedOptions.base!)
  }
  const plugin = <PluginOption>{
    name: 'unplugin-pwa:dev',
    apply: 'serve',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    async options() {
      // ctx.options is available here, because the main plugin sets it in configResolved hook
      if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled === true) {
        // @ts-expect-error filter exists in Vite 6.3+
        delete plugin.resolveId!.filter
        // @ts-expect-error filter exists in Vite 6.3+
        delete plugin.load!.filter

        await prepareSwNamesAndGlobDirectory(ctx)
      }
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        return transformHtml(html)
      },
      enforce: 'post',
      async transform(html: string) {
        return transformHtml(html)
      },
    },
    configureServer(server) {
      if (!ctx.envApi && ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
        return
      }
      ctx.devEnvironment = true
      if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled === true) {
        if (!ctx.envApi) {
          server.ws.on(DEV_READY_NAME, createWSResponseHandler(server, ctx))
          return
        }
        server.environments.client.hot.on(DEV_READY_NAME, createWSResponseHandler(server, ctx))
      }
    },
    resolveId: {
      // filter is deleted if `!options.disable && options.devOptions.enabled` is true
      filter: { id: exactRegex(DEV_SW_VIRTUAL) },
      async handler(id) {
        if (!ctx.envApi && ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
          return undefined
        }

        if (id === DEV_SW_VIRTUAL) {
          return RESOLVED_DEV_SW_VIRTUAL
        }

        const internalDevOptions = ctx.dev.options!
        const swNames = internalDevOptions.swNames

        const normalizedId = id.startsWith('/') ? id.slice(1) : id
        if (
          normalizedId === swNames.name
          || normalizedId === swNames.classic
          || normalizedId === swNames.module
        ) {
          return id
        }

        const swAssetsPaths = ctx.dev.options!.swAssetsPaths

        const normalizedAsset = id.startsWith('./') ? id.slice(1) : id

        return swAssetsPaths.has(normalizedAsset) ? normalizedAsset : undefined
      },
    },
    load: {
      // filter is deleted if `!options.disable && options.devOptions.enabled` is true
      filter: { id: exactRegex(RESOLVED_DEV_SW_VIRTUAL) },
      async handler(id) {
        if (id === RESOLVED_DEV_SW_VIRTUAL) {
          return await createHmrScript()
        }

        const internalDevOptions = ctx.dev.options!
        const swAssetsPaths = internalDevOptions.swAssetsPaths
        const swNames = internalDevOptions.swNames

        const normalizedId = id.startsWith('/') ? id.slice(1) : id
        if (
          normalizedId === swNames.name
          || normalizedId === swNames.classic
          || normalizedId === swNames.module
        ) {
          if (!ctx.dev.options.swGenerated) {
            await prepareSwBuild(ctx)
          }

          return await fs.readFile(swAssetsPaths.get(id)!, 'utf8')
        }

        if (swAssetsPaths.has(id)) {
          return await fs.readFile(swAssetsPaths.get(id)!, 'utf-8')
        }

        return undefined
      },
    },
  }

  return plugin
}

function createWSResponseHandler(
  server: ViteDevServer,
  ctx: VitePWAPluginContext<any, any, any, any>,
): () => Promise<void> {
  return async () => {
    const { injectRegister, scope, base } = ctx.resolvedOptions
    // don't send the sw registration if virtual imported or disabled
    if (!ctx.useImportRegister && injectRegister) {
      if (injectRegister === 'auto') {
        ctx.resolvedOptions.injectRegister = 'script'
      }

      await prepareRegisterSw(ctx)

      let module = false
      switch (ctx.strategy) {
        case 'generate-sw':
          module = ctx.resolvedOptions.generateSW?.swType === 'classic-and-module'
          break
        case 'build-sw':
          module = ctx.resolvedOptions.buildSW?.swType === 'classic-and-module'
          break
      }

      if (!ctx.envApi) {
        server.ws.send({
          type: 'custom',
          event: DEV_REGISTER_SW_NAME,
          data: {
            module,
            mode: ctx.resolvedOptions.injectRegister,
            scope,
            // todo: check this, it is wrong
            inlinePath: `${base}${DEV_SW_NAME}`,
            registerPath: `${base}${FILE_SW_REGISTER}`,
            swType: ctx.resolvedOptions.devOptions?.type,
          },
        })
        return
      }

      server.environments.client.hot.send({
        type: 'custom',
        event: DEV_REGISTER_SW_NAME,
        data: {
          module,
          mode: ctx.resolvedOptions.injectRegister,
          scope,
          // todo: check this, it is wrong
          inlinePath: `${base}${DEV_SW_NAME}`,
          registerPath: `${base}${FILE_SW_REGISTER}`,
          swType: ctx.resolvedOptions.devOptions?.type,
        },
      })
    }
  }
}
