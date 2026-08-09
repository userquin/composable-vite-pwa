import type { Compiler } from 'webpack'
import type { PWAPluginContext } from '../context-types'
import path from 'node:path'
import process from 'node:process'
import VirtualModulesPlugin from 'webpack-virtual-modules'
import {
  DEV_SW_VIRTUAL,
  DEV_SW_VIRTUAL_VIRTUAL,
  PWA_ASSETS_HEAD_VIRTUAL,
  PWA_ASSETS_ICONS_VIRTUAL,
  PWA_INFO_VIRTUAL,
  VIRTUAL_MODULES,
  VIRTUAL_MODULES_MAP,
} from '../constants'
import { generateVirtualModule } from '../generate-virtual-module'
import { extractIcons } from '../pwa-assets/utils'
import { createWebpackHmrScript } from './create-hmr-script'

const virtualIds = [
  ...VIRTUAL_MODULES,
  PWA_INFO_VIRTUAL,
  PWA_ASSETS_HEAD_VIRTUAL,
  PWA_ASSETS_ICONS_VIRTUAL,
  DEV_SW_VIRTUAL,
  DEV_SW_VIRTUAL_VIRTUAL,
]

export function applyVirtualModules(
  compiler: Compiler,
  ctx: PWAPluginContext<any, any, any>,
  prepared: Promise<void>,
): void {
  const root = compiler.options.context || process.cwd()
  const modulePaths = new Map(virtualIds.map((id, index) => [
    id,
    path.resolve(root, 'node_modules/.unplugin-pwa', `${index}.js`),
  ]))
  const plugin = new VirtualModulesPlugin()
  plugin.apply(compiler)

  compiler.options.resolve.alias = {
    ...(compiler.options.resolve.alias || {}),
    ...Object.fromEntries(modulePaths),
  }

  // Requests containing `virtual:` are treated as URI schemes before aliases run.
  compiler.hooks.normalModuleFactory.tap('unplugin-pwa:virtual-modules', (factory) => {
    factory.hooks.beforeResolve.tap('unplugin-pwa:virtual-modules', (data) => {
      const replacement = modulePaths.get(data.request)
      if (replacement) {
        if (data.request in VIRTUAL_MODULES_MAP)
          ctx.useImportRegister = true
        data.request = replacement
      }
    })
  })

  compiler.hooks.beforeCompile.tapPromise('unplugin-pwa:virtual-modules', async () => {
    await prepared
    for (const [id, file] of modulePaths)
      plugin.writeModule(file, await generateModule(id, ctx))
  })
}

async function generateModule(id: string, ctx: PWAPluginContext<any, any, any>): Promise<string> {
  if (id in VIRTUAL_MODULES_MAP) {
    return await generateVirtualModule(ctx, VIRTUAL_MODULES_MAP[id])
  }

  if (id === PWA_INFO_VIRTUAL)
    return await generatePwaInfo(ctx)

  if (id === PWA_ASSETS_HEAD_VIRTUAL) {
    const generator = await ctx.pwaAssetsGenerator
    const head = generator?.resolveHtmlAssets() ?? { links: [], themeColor: undefined }
    return `export const pwaAssetsHead = ${JSON.stringify(head)}`
  }

  if (id === PWA_ASSETS_ICONS_VIRTUAL) {
    const generator = await ctx.pwaAssetsGenerator
    return `export const pwaAssetsIcons = ${JSON.stringify(extractIcons(generator?.instructions()))}`
  }

  if (ctx.devEnvironment && ctx.resolvedOptions.devOptions?.enabled)
    return await createWebpackHmrScript(ctx)

  return 'export function registerDevSW() {}\nexport function setDevPWASwitcherReady() {}'
}

async function generatePwaInfo(ctx: PWAPluginContext<any, any, any>): Promise<string> {
  const webManifest = ctx.webManifestData()
  if (!webManifest)
    return 'export const pwaInfo = undefined'

  const register = await ctx.registerSWData()
  const pwaInfo = {
    pwaInDevEnvironment: ctx.devEnvironment,
    webManifest: {
      href: webManifest.href,
      useCredentials: webManifest.useCredentials,
      linkTag: webManifest.toLinkTag(),
    },
    registerSW: register && {
      module: register.module,
      mode: register.mode,
      inlinePath: register.inlinePath,
      registerPath: register.registerPath,
      scope: register.scope,
      type: register.type,
      scriptTag: register.toScriptTag(),
    },
  }
  return `export const pwaInfo = ${JSON.stringify(pwaInfo)}`
}
