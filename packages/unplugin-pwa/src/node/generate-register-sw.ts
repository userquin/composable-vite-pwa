import type { PWAPluginContext } from './context-types'
import type { ResolvedVitePWAOptions } from './types'
import { existsSync, promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from './build-pwa-asset'
import { FILE_SW_REGISTER } from './constants'
import { generateSimpleSWRegister } from './html'

export async function generateRegisterSW(
  ctx: PWAPluginContext<any, any, any, any>,
): Promise<string | undefined> {
  if (ctx.resolvedOptions.injectRegister === 'auto') {
    ctx.resolvedOptions.injectRegister = ctx.useImportRegister ? null : 'script'
  }

  if (!(ctx.resolvedOptions.injectRegister === 'script' || ctx.resolvedOptions.injectRegister === 'script-defer') || existsSync(resolve(ctx.publicDir, FILE_SW_REGISTER))) {
    return undefined
  }

  let source: string

  if (ctx.resolvedOptions.swType === 'classic-and-module') {
    const _dirname = typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url))
    const content = await fs.readFile(resolve(_dirname, `../client/build/registerSW.js`), 'utf-8')
    source = await buildPwaAsset(
      content,
      ctx,
    )
  }
  else {
    source = generateSimpleSWRegister(
      ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>,
      ctx.resolvedOptions.swType!,
      false,
    )
  }

  return source
}
