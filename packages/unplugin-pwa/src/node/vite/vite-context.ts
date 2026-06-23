import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { PWAPluginContext } from '../context-types'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import { createPWAContext } from '../context'

export type ViteBundler = 'vite' | 'vite-legacy'

export type VitePWAPluginContext<
  B extends ViteBundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
> = PWAPluginContext<B, UserStrategy, S, T> & {
  viteConfig: ResolvedConfig
  envApi: boolean
}

export function createVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<'vite', UserStrategy, S, T> {
  const ctx = Object.assign(
    createPWAContext('vite', userOptions) as VitePWAPluginContext<'vite', UserStrategy, S, T>,
    {
      viteConfig: undefined!,
      envApi: false,
    },
  )

  ctx.dev.customHMRPwaAsset = async (asset, source) => {
    return await import('./dev/hmr-support').then(({
      customHMR,
    }) => customHMR(
      ctx,
      asset,
      source,
    ))
  }

  return ctx
}
export function createViteLegacyPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<'vite-legacy', UserStrategy, S, T> {
  const ctx = Object.assign(
    createPWAContext('vite-legacy', userOptions) as VitePWAPluginContext<'vite-legacy', UserStrategy, S, T>,
    {
      viteConfig: undefined!,
      envApi: false,
    },
  )

  ctx.dev.customHMRPwaAsset = async (asset, source) => {
    return await import('./dev/hmr-support').then(({
      customHMR,
    }) => customHMR(
      ctx,
      asset,
      source,
    ))
  }

  return ctx
}
