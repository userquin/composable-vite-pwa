import type { PWAPluginContext } from './context-types'
import { FILE_SW_REGISTER } from './constants'
import { generateRegisterSW } from './generate-register-sw'

/**
 * Creates the `registerSW.js` script to be added to the HTML entry point.
 * @param ctx The PWA Context.
 * @param dev For dev server
 * @param injectAtDev Inject the script at dev server?
 */
export async function createGenerateRegisterSW(
  ctx: PWAPluginContext<any, any, any, any>,
  dev: boolean,
  injectAtDev = true,
) {
  if (dev && !injectAtDev) {
    return undefined
  }
  if (ctx.resolvedOptions.injectRegister === 'inline') {
    return `<script id="unplugin-pwa:inline-sw">${await generateRegisterSW(ctx)}</script>`
  }

  if (ctx.resolvedOptions.injectRegister === 'script' || ctx.resolvedOptions.injectRegister === 'script-defer') {
    const hasDefer = ctx.resolvedOptions.injectRegister === 'script-defer'
    return `<script id="unplugin-pwa:register-sw" src="${dev ? ctx.resolvedOptions.base : ctx.resolvedOptions.buildBase}${FILE_SW_REGISTER}"${hasDefer ? ' defer' : ''}></script>`
  }

  return undefined
}
