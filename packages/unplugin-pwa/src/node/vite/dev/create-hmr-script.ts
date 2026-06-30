import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from '../../build-pwa-asset'
import { DEV_PWA_DUAL_SW_SWITCHER_NAME } from '../../constants'

export async function createHmrScript<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
) {
  const base = path.dirname(fileURLToPath(import.meta.url))

  return await buildPwaAsset(
    await fs.readFile(path.resolve(base, '../../../client/dev/vite/hmr.js'), 'utf-8'),
    ctx,
    {
      resolveId(id) {
        return id === DEV_PWA_DUAL_SW_SWITCHER_NAME ? id : undefined
      },
      async load(id) {
        return id === DEV_PWA_DUAL_SW_SWITCHER_NAME
          ? await fs.readFile(path.resolve(base, '../../../client/dev/vite/switcher.js'), 'utf-8')
          : undefined
      },
    },
  )
}
