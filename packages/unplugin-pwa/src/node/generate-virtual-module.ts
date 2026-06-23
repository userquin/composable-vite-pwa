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

  const internalDevOptions = ctx.dev.options!
  const key = `virtual:pwa-register${source === 'register' ? '' : `/${source}`}`
  if (!internalDevOptions.registerVirtualSWGenerated) {
    const code = await buildPwaAsset(
      ctx.devEnvironment && ctx.dev.customHMRPwaAsset
        ? await ctx.dev.customHMRPwaAsset('virtual-register-sw', source)
        : await fs.readFile(resolve(_dirname, `../client/build/${source}.js`), 'utf-8'),
      ctx,
    )
    internalDevOptions.swAssetsPaths.set(key, code)
    internalDevOptions.registerVirtualSWGenerated = true
    return code
  }

  return internalDevOptions.swAssetsPaths.get(key)!
}
