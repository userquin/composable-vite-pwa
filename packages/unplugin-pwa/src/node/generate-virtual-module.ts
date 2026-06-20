import type { PWAPluginContext } from './context-types'
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from './build-pwa-asset'

export async function generateVirtualModule(
  ctx: PWAPluginContext<any, any, any, any>,
  source = 'register',
): Promise<string> {
  const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

  if (ctx.resolvedOptions.disable || (ctx.devEnvironment && !ctx.resolvedOptions.devOptions?.enabled)) {
    return await fs.readFile(resolve(_dirname, `../client/dev/${source}.js`), 'utf-8')
  }

  const content = await fs.readFile(resolve(_dirname, `../client/build/${source}.js`), 'utf-8')
  return await buildPwaAsset(
    content,
    ctx,
  )
}
