import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { CustomPwaAssetResolver } from '../context-types'
import type { VitePWAStrategy } from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from '../build-pwa-asset'
import { DEV_PWA_DUAL_SW_SWITCHER_NAME, DEV_PWA_REGISTER_NAME } from '../constants'

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

    let code = await fs.readFile(virtualPath, 'utf-8')
    if (ctx.devEnvironment && ctx.hmrRequiresSwitcher) {
      const prefaceIdx = code.indexOf('export function registerSW(')
      const imports = code.slice(0, prefaceIdx)
      const registerSWCode = code.slice(prefaceIdx)
      code = `import { registerDevSW } from "./hmr.js";
${imports}

if (import.meta.hot) {
  registerDevSW();
}

${registerSWCode}
`
    }

    return await buildPwaAsset(
      code,
      ctx,
      {
        resolveId(id) {
          return id === DEV_PWA_REGISTER_NAME || id === DEV_PWA_DUAL_SW_SWITCHER_NAME || id === './hmr.js' ? id : undefined
        },
        async load(id) {
          if (id === DEV_PWA_REGISTER_NAME) {
            return await fs.readFile(registerPath, 'utf-8')
          }

          if (id === './hmr.js') {
            return await fs.readFile(path.resolve(path.dirname(registerPath), 'hmr.js'), 'utf-8')
          }

          if (id === DEV_PWA_DUAL_SW_SWITCHER_NAME) {
            return await fs.readFile(path.resolve(path.dirname(registerPath), DEV_PWA_DUAL_SW_SWITCHER_NAME), 'utf-8')
          }

          return undefined
        },
      },
    )
  }
}
