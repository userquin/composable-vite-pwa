import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin, ViteDevServer } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import { exactRegex } from '@rolldown/pluginutils'
import {
  DEV_READY_NAME,
  DEV_REGISTER_SW_NAME,
  DEV_SW_NAME,
  DEV_SW_VIRTUAL,
  DEV_SW_VIRTUAL_VIRTUAL,
  DEV_SWITCHER_NAME,
  FILE_SW_REGISTER,
  RESOLVED_DEV_SW_VIRTUAL,
  VIRTUAL_MODULES,
  VIRTUAL_MODULES_RESOLVE_PREFIX,
} from '../../constants'
import { prepareSwBuild } from '../../dev/prepare-sw-build'
import { prepareSwNamesAndGlobDirectory } from '../../dev/prepare-sw-names-and-glob-directory'
import { isDualServiceWorker } from '../../dual-sw-utilities'
import { injectWebManifestHtmlLink } from '../../inject-web-manifest-html-link'
import { createHmrScript } from '../dev/create-hmr-script'
import { injectHmrScript } from '../dev/inject-hmr-script'
import { prepareRegisterSw } from '../dev/prepare-register-sw'

export function DevPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  const transformHtml = (html: string): string => {
    if (!ctx.envApi && ctx.viteConfig.build.ssr) {
      return html
    }

    html = injectWebManifestHtmlLink(html, ctx)

    return injectHmrScript(html, ctx.resolvedOptions.base!)
  }
  const plugin = <Plugin>{
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

        if (ctx.externalConfigurationLoader) {
          return
        }

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
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }
      ctx.devEnvironment = true
      if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled === true) {
        const onMessage = ctx.envApi
          ? server.environments.client.hot.on
          : server.ws.on
        onMessage(DEV_READY_NAME, createWSResponseHandler(server, ctx))
        if (isDualServiceWorker(ctx)) {
          onMessage(DEV_SWITCHER_NAME, createSwitchServiceWorkerResponseHandler(server, ctx))
        }
      }
    },
    resolveId: {
      // filter is deleted if `!options.disable && options.devOptions.enabled` is true
      filter: { id: [exactRegex(DEV_SW_VIRTUAL), exactRegex(DEV_SW_VIRTUAL_VIRTUAL)] },
      async handler(id) {
        if (!ctx.envApi && ctx.viteConfig.build.ssr) {
          return undefined
        }

        if (id === DEV_SW_VIRTUAL || id === DEV_SW_VIRTUAL_VIRTUAL) {
          return RESOLVED_DEV_SW_VIRTUAL
        }

        const [normalizedId, useId] = ctx.normalizeDevServiceWorkerId?.(
          'resolveId',
          'sw',
          id,
        ) ?? ([id.startsWith('/') ? id.slice(1) : id, id])
        const internalDevOptions = ctx.dev.options!
        const swNames = internalDevOptions.swNames

        if (
          normalizedId === swNames.name
          || normalizedId === swNames.classic
          || normalizedId === swNames.module
        ) {
          return useId
        }

        const swAssetsPaths = ctx.dev.options!.swAssetsPaths

        const [normalizedAsset, assetId] = ctx.normalizeDevServiceWorkerId?.(
          'resolveId',
          'sw-dep',
          id,
        ) ?? ([
          id.startsWith('./') ? id.slice(1) : id,
          id.startsWith('./') ? id.slice(1) : id,
        ])

        // fast path when ctx.base === '/'
        if (swAssetsPaths.has(normalizedAsset)) {
          return assetId
        }

        // assets stored with ctx.base
        if (swAssetsPaths.has(`${ctx.base}${normalizedAsset.startsWith('/') ? normalizedAsset.slice(1) : normalizedAsset}`)) {
          return assetId
        }

        return undefined
      },
    },
    load: {
      // filter is deleted if `!options.disable && options.devOptions.enabled` is true
      filter: { id: exactRegex(RESOLVED_DEV_SW_VIRTUAL) },
      async handler(id) {
        const internalDevOptions = ctx.dev.options!
        const swAssetsPaths = internalDevOptions.swAssetsPaths

        if (id === RESOLVED_DEV_SW_VIRTUAL) {
          if (!internalDevOptions.hmrEntryPointGenerated || !swAssetsPaths.has(DEV_SW_VIRTUAL)) {
            const code = await createHmrScript(ctx)
            swAssetsPaths.set(DEV_SW_VIRTUAL, code)
            internalDevOptions.hmrEntryPointGenerated = true
            return code
          }
          return swAssetsPaths.get(DEV_SW_VIRTUAL)
        }

        // TODO: remove pair we only need an id (every impl. returning the same pair)
        const [normalizedId, swId] = ctx.normalizeDevServiceWorkerId?.(
          'load',
          'sw',
          id,
        ) ?? ([id.startsWith('/') ? id.slice(1) : id, id])
        const swNames = internalDevOptions.swNames

        if (
          normalizedId === swNames.name
          || normalizedId === swNames.classic
          || normalizedId === swNames.module
        ) {
          if (!ctx.dev.options.swGenerated) {
            await prepareSwBuild(ctx)
          }

          // assets stored with ctx.base
          return await fs.readFile(
            swAssetsPaths.get(swId) ?? swAssetsPaths.get(`${ctx.base}${swId.startsWith('/') ? swId.slice(1) : swId}`)!,
            'utf8',
          )
        }

        // TODO: remove pair we only need an id (every impl. returning the same pair)
        const [normalizedAsset, assetId] = ctx.normalizeDevServiceWorkerId?.(
          'load',
          'sw-dep',
          id,
        ) ?? id

        // fast path when ctx.base === '/'
        let asset = swAssetsPaths.get(normalizedAsset)

        if (asset) {
          return await fs.readFile(asset, 'utf-8')
        }

        // assets stored with ctx.base
        asset = swAssetsPaths.get(`${ctx.base}${normalizedAsset.startsWith('/') ? normalizedAsset.slice(1) : normalizedAsset}`)

        if (asset) {
          return await fs.readFile(asset, 'utf-8')
        }

        return undefined
      },
    },
    async handleHotUpdate({ server, file }) {
      if (ctx.sources.has(file)) {
        // regenerate service workers without reset ctx.dev.options.swGenerated
        await prepareSwBuild(ctx)
        const internalDevOptions = ctx.dev.options!
        if (ctx.envApi) {
          const moduleGraph = server.environments.client.moduleGraph
          const envApiModules: ReturnType<typeof moduleGraph.getModuleById>[] = []
          for (const m of internalDevOptions.swAssetsPaths.keys()) {
            // we need to invalidate resolved virtual modules
            const mod = VIRTUAL_MODULES.includes(m)
              ? moduleGraph.getModuleById(VIRTUAL_MODULES_RESOLVE_PREFIX + m)
              : m === DEV_SW_VIRTUAL
                ? moduleGraph.getModuleById(RESOLVED_DEV_SW_VIRTUAL)
                : moduleGraph.getModuleById(m)
            if (mod) {
              envApiModules.push(mod)
            }
          }
          for (const module of envApiModules) {
            moduleGraph.invalidateModule(module!)
          }
        }
        else {
          const moduleGraph = server.moduleGraph
          const envApiModules: ReturnType<typeof moduleGraph.getModuleById>[] = []
          for (const m of internalDevOptions.swAssetsPaths.keys()) {
            // we need to invalidate resolved virtual modules
            const mod = VIRTUAL_MODULES.includes(m)
              ? moduleGraph.getModuleById(VIRTUAL_MODULES_RESOLVE_PREFIX + m)
              : m === DEV_SW_VIRTUAL
                ? moduleGraph.getModuleById(RESOLVED_DEV_SW_VIRTUAL)
                : moduleGraph.getModuleById(m)
            if (mod) {
              envApiModules.push(mod)
            }
          }
          for (const module of envApiModules) {
            moduleGraph.invalidateModule(module!)
          }
        }

        const sendMessage = ctx.envApi
          ? server.environments.client.hot.send
          : server.ws.send

        sendMessage({ type: 'full-reload' })
      }
    },
  }

  return plugin
}

function createWSResponseHandler(
  server: ViteDevServer,
  ctx: VitePWAPluginContext<any, any, any>,
): () => Promise<void> {
  return async () => {
    const { injectRegister, scope, base } = ctx.resolvedOptions
    // don't send the sw registration if virtual imported or disabled
    if (!ctx.useImportRegister && injectRegister) {
      if (injectRegister === 'auto') {
        ctx.resolvedOptions.injectRegister = 'script'
      }

      await prepareRegisterSw(ctx)

      const sendMessage = ctx.envApi
        ? server.environments.client.hot.send
        : server.ws.send

      sendMessage({
        type: 'custom',
        event: DEV_REGISTER_SW_NAME,
        data: {
          module: isDualServiceWorker(ctx),
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

function createSwitchServiceWorkerResponseHandler(
  server: ViteDevServer,
  ctx: VitePWAPluginContext<any, any, any>,
): () => Promise<void> {
  return async () => {
    if (!isDualServiceWorker(ctx)) {
      return
    }
    const internalDevOptions = ctx.dev.options!
    if (internalDevOptions.swType === 'module') {
      internalDevOptions.swName = internalDevOptions.swNames.classic
      internalDevOptions.swType = 'classic'
    }
    else {
      internalDevOptions.swName = internalDevOptions.swNames.module
      internalDevOptions.swType = 'module'
    }

    const sendMessage = ctx.envApi
      ? server.environments.client.hot.send
      : server.ws.send

    const additionalInvalidation: string[] = []
    const injectRegister = ctx.resolvedOptions.injectRegister
    // invalidate hmr context
    internalDevOptions.hmrEntryPointGenerated = false
    if (ctx.useImportRegister) {
      internalDevOptions.registerVirtualSWGenerated = false
    }
    else if (injectRegister === 'inline') {
      internalDevOptions.registerSWGenerated = false
      additionalInvalidation.push(`${ctx.base}${FILE_SW_REGISTER}`)
    }
    else if (injectRegister === 'script' || injectRegister === 'script-defer') {
      internalDevOptions.registerSWGenerated = false
      additionalInvalidation.push(`${ctx.base}${FILE_SW_REGISTER}`)
    }

    if (ctx.envApi) {
      const moduleGraph = server.environments.client.moduleGraph
      const envApiModules: ReturnType<typeof moduleGraph.getModuleById>[] = []
      for (const m of internalDevOptions.swAssetsPaths.keys()) {
        // we need to invalidate resolved virtual modules
        const mod = VIRTUAL_MODULES.includes(m)
          ? moduleGraph.getModuleById(VIRTUAL_MODULES_RESOLVE_PREFIX + m)
          : m === DEV_SW_VIRTUAL
            ? moduleGraph.getModuleById(RESOLVED_DEV_SW_VIRTUAL)
            : moduleGraph.getModuleById(m)
        if (mod) {
          envApiModules.push(mod)
        }
      }
      for (const module of envApiModules) {
        moduleGraph.invalidateModule(module!)
      }
    }
    else {
      const moduleGraph = server.moduleGraph
      const envApiModules: ReturnType<typeof moduleGraph.getModuleById>[] = []
      for (const m of internalDevOptions.swAssetsPaths.keys()) {
        // we need to invalidate resolved virtual modules
        const mod = VIRTUAL_MODULES.includes(m)
          ? moduleGraph.getModuleById(VIRTUAL_MODULES_RESOLVE_PREFIX + m)
          : m === DEV_SW_VIRTUAL
            ? moduleGraph.getModuleById(RESOLVED_DEV_SW_VIRTUAL)
            : moduleGraph.getModuleById(m)
        if (mod) {
          envApiModules.push(mod)
        }
      }
      for (const module of envApiModules) {
        moduleGraph.invalidateModule(module!)
      }
    }

    sendMessage({ type: 'full-reload' })

    await ctx.hooks.callHook('service-worker:switched')
  }
}
