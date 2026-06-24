import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { CustomPwaAssetResolver } from '../context-types'
import type { VitePWAStrategy } from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from '../build-pwa-asset'
import { DEV_PWA_REGISTER_NAME } from '../constants'

export function pwaAssetsResolver<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
): CustomPwaAssetResolver {
  return async (asset, virtualName) => {
    const base = path.dirname(fileURLToPath(import.meta.url))

    const folder = ctx.devEnvironment
      ? '../../client/dev/vite'
      : '../../client/build'

    if (asset === 'register-sw') {
      return await buildPwaAsset(
        await fs.readFile(path.resolve(base, `${folder}/registerSW.js`), 'utf-8'),
        ctx,
      )
    }

    const virtualPath = ctx.devEnvironment
      ? virtualName === 'register'
        ? path.resolve(base, folder, 'register.js')
        : path.resolve(base, '../../client/build', `${virtualName}.js`)
      : path.resolve(base, folder, `${virtualName}.js`)

    // to resolve ./register.js for framework virtual modules at rolldown memory build
    const registerPath = ctx.devEnvironment
      ? path.resolve(base, folder, 'register.js')
      : path.resolve(base, '../../client/build', 'register.js')

    return await buildPwaAsset(
      await fs.readFile(virtualPath, 'utf-8'),
      ctx,
      {
        resolveId(id) {
          return id === DEV_PWA_REGISTER_NAME ? id : undefined
        },
        async load(id) {
          return id === DEV_PWA_REGISTER_NAME
            ? await fs.readFile(registerPath, 'utf-8')
            : undefined
        },
      },
    )
  }
}
