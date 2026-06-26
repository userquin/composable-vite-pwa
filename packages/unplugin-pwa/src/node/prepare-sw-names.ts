import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { GlobPartial, RequiredSWDestPartial, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, PWAPluginContext } from './context-types'
import type { VitePWAStrategy } from './types'
import { resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export function prepareSwNames<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, S, T>,
) {
  let options: (GlobPartial & RequiredSWDestPartial) | undefined
  let swSrc: string | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = ''
      options = ctx.resolvedOptions.generateSW as (GlobPartial & RequiredSWDestPartial)
      break
    case 'inject-manifest':
      options = ctx.resolvedOptions.injectManifest as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      break
    case 'build-sw':
      options = ctx.resolvedOptions.buildSW as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.buildSW!.swSrc
      break
  }

  if (options) {
    const {
      swDest,
      classicSWDest,
      moduleSWDest,
    } = resolveSWNames(
      options.swDest,
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
