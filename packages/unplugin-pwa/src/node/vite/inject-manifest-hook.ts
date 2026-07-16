import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { VitePWAStrategy } from '../types'
import type { ViteBundler, VitePWAPluginContext } from './vite-context'
import path from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export function injectManifestSWAtPublicDir<
  B extends ViteBundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<B, UserStrategy, T>,
) {
  return (): boolean => {
    const swSrcDir = normalizePath(path.dirname(path.resolve(process.cwd(), ctx.resolvedOptions.injectManifest!.swSrc as string)))
    const publicDir = normalizePath(path.resolve(process.cwd(), ctx.viteConfig.publicDir || 'public'))

    return swSrcDir === publicDir
  }
}
