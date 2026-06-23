import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PwaAsset } from '../../context-types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function addHMRSupport<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
  asset: PwaAsset,
  code: string,
): Promise<string> {
  let enable = false
  switch (ctx.strategy) {
    case 'generate-sw':
      enable = ctx.resolvedOptions.generateSW?.swType === 'classic-and-module'
      break
    case 'build-sw':
      enable = ctx.resolvedOptions.buildSW?.swType === 'classic-and-module'
      break
  }

  if (!enable) {
    return code
  }

  const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

  const switcher = await fs.readFile(
    resolve(
      _dirname,
      `../../../client/dev/vite/switcher.js`,
    ),
    'utf-8',
  )

  return `${code}
  
${switcher}
`
}
