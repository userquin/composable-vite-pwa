import type { PWAPluginContext } from './context-types'
import { existsSync, promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from './build-pwa-asset'
import { FILE_SW_REGISTER } from './constants'

export async function generateRegisterSW(
  ctx: PWAPluginContext<any, any, any, any>,
): Promise<string | undefined> {
  if (ctx.resolvedOptions.injectRegister === 'auto') {
    ctx.resolvedOptions.injectRegister = ctx.useImportRegister ? null : 'script'
  }

  if (!(ctx.resolvedOptions.injectRegister === 'script' || ctx.resolvedOptions.injectRegister === 'script-defer') || existsSync(resolve(ctx.publicDir, FILE_SW_REGISTER))) {
    return undefined
  }

  const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

  return await buildPwaAsset(
    await fs.readFile(
      resolve(
        _dirname,
        `../client/build/${FILE_SW_REGISTER}`,
      ),
      'utf-8',
    ),
    ctx,
  )
}
