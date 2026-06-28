import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { PWAPluginContext } from '../context-types'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import { createPWAContext } from '../context'
import { pwaAssetsResolver } from './pwa-assets-resolver'

export type ViteBundler = 'vite' | 'vite-legacy'

export type ServiceWorkerAssetNormalizer = (
  hook: 'resolveId' | 'load',
  depType: 'sw' | 'sw-dep',
  id: string,
) => [normalizedId: string, assetName: string]

export type VitePWAPluginContext<
  B extends ViteBundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
> = PWAPluginContext<B, UserStrategy, S, T> & {
  viteConfig: ResolvedConfig
  envApi: boolean
  /**
   * This hook will be called when resolving the service worker at dev plugin.
   *
   * The default hook will just remove the `/` prefix at resolveId and load hooks.
   *
   * @param hook The hook resolving the service worker or its dependencies.
   * @param depType The service worker or its dependency.
   * @param id The resolveId/load Vite plugin hook.
   * @return The normalized id to check against the service worker or its dependency and the name in the build pair.
   */
  normalizeDevServiceWorkerId?: ServiceWorkerAssetNormalizer
}

export function createCustomVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
  B extends ViteBundler,
>(
  bundler: B,
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<B, UserStrategy, S, T> {
  const ctx = Object.assign(
    createPWAContext(bundler, userOptions) as VitePWAPluginContext<B, UserStrategy, S, T>,
    {
      viteConfig: undefined!,
      envApi: false,
    },
  )

  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return ctx
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

  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

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

  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return ctx
}
