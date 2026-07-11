import type { PWAPluginContext } from './context-types'
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function generateVirtualModule(
  ctx: PWAPluginContext<any, any, any>,
  source = 'register',
): Promise<string> {
  if (ctx.resolvedOptions.disable || (ctx.devEnvironment && !ctx.resolvedOptions.devOptions?.enabled)) {
    const _dirname = typeof __dirname !== 'undefined'
      ? __dirname
      : dirname(fileURLToPath(import.meta.url))

    return await fs.readFile(resolve(_dirname, `../client/dev/${source}.js`), 'utf-8')
  }

  const internalDevOptions = ctx.dev.options!
  const key = `virtual:pwa-register${source === 'register' ? '' : `/${source}`}`
  if (!internalDevOptions.registerVirtualSWGenerated) {
    const code = await ctx.customPwaAssetResolver('virtual-register-sw', source)
    internalDevOptions.swAssetsPaths.set(key, code)
    internalDevOptions.registerVirtualSWGenerated = true
    return code
  }

  return internalDevOptions.swAssetsPaths.get(key)!
}
