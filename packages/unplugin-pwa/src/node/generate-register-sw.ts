import type { PWAPluginContext } from './context-types'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { FILE_SW_REGISTER } from './constants'

/**
 * Generates `registerSW.js` file for the service worker registration.
 * @param ctx The PWA plugin context.
 * @return The code of `registerSW.js` or `undefined` if it is not required.
 */
export async function generateRegisterSW(
  ctx: PWAPluginContext<any, any, any, any>,
): Promise<string | undefined> {
  if (ctx.resolvedOptions.injectRegister === 'auto') {
    ctx.resolvedOptions.injectRegister = ctx.useImportRegister ? null : 'script'
  }

  if (!(ctx.resolvedOptions.injectRegister === 'script' || ctx.resolvedOptions.injectRegister === 'script-defer') || existsSync(resolve(ctx.publicDir, FILE_SW_REGISTER))) {
    return undefined
  }

  return await ctx.customPwaAssetResolver('register-sw')
}
