import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import { resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export function prepareBuildSwNames<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, S, T>,
) {
  let swSrc: string | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = 'x'
      break
    case 'inject-manifest':
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      break
    case 'build-sw':
      swSrc = ctx.resolvedOptions.buildSW!.swSrc
      break
  }

  if (swSrc) {
    const {
      filename = 'sw.js',
    } = ctx.consumerOptions
    const {
      swDest,
      classicSWDest,
      moduleSWDest,
    } = resolveSWNames(
      ctx.strategy === 'generate-sw' ? '' : filename,
      swSrc as string,
      ctx.strategy === 'generate-sw',
    )
    ctx.swNames = {
      hasNames: true,
      name: swDest,
      classic: classicSWDest,
      module: moduleSWDest,
    }
  }
}
