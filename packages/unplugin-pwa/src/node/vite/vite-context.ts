import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { PWAPluginContext } from '../context-types'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import { createPWAContext } from '../context'
import { injectManifestSWAtPublicDir } from './inject-manifest-hook'
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
  T extends SWType,
> = PWAPluginContext<B, UserStrategy, T> & {
  /**
   * The resolved Vite configuration for the client build.
   */
  viteConfig: ResolvedConfig
  /**
   * Should enable Vite Environment Api?.
   */
  envApi: boolean
  /**
   * This hook will be called when resolving the service worker at dev plugin (only when using dev server).
   *
   * The default hook will just remove the `/` prefix at resolveId and load hooks.
   *
   * Use this if your framework transforming requests, for example Nuxt will add `/__skip-vite` prefix.
   * Nuxt integration removes the prefix `/__skip-vite` and some custom Vite middlewares for the service workers and their map files.
   *
   * @param hook The hook resolving the service worker or its dependencies.
   * @param depType The service worker or its dependency.
   * @param id The resolveId/load Vite plugin hook.
   * @return The normalized id to check against the service worker or its dependency and the name in the build pair.
   */
  normalizeDevServiceWorkerId?: ServiceWorkerAssetNormalizer
}

/**
 * Helper to create a Vite PWA context for modern versions (Vite >= 6).
 * @param bundler Type of bundler to use.
 * @param envApi Should Vite Environment Api be enabled?.
 * @param userOptions The PWA options.
 */
export function createCustomVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  B extends ViteBundler,
>(
  bundler: B,
  envApi: boolean,
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<B, UserStrategy, T> {
  const ctx = Object.assign(
    createPWAContext(bundler, userOptions) as VitePWAPluginContext<B, UserStrategy, T>,
    {
      viteConfig: undefined!,
      envApi,
    },
  )

  ctx.injectManifestSWAtPublicDir = injectManifestSWAtPublicDir(ctx)
  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return ctx
}

/**
 * Helper to create a Vite PWA context for modern versions (Vite >= 6).
 * @param envApi Should Vite Environment Api be enabled?.
 * @param userOptions The PWA options.
 */
export function createVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  envApi: boolean,
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<'vite', UserStrategy, T> {
  const ctx = Object.assign(
    createPWAContext('vite', userOptions) as VitePWAPluginContext<'vite', UserStrategy, T>,
    {
      viteConfig: undefined!,
      envApi,
    },
  )

  ctx.injectManifestSWAtPublicDir = injectManifestSWAtPublicDir(ctx)
  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return ctx
}

/**
 * Helper to create a Vite PWA context for legacy version (Vite < 6).
 * @param userOptions The PWA options.
 */
export function createViteLegacyPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): VitePWAPluginContext<'vite-legacy', UserStrategy, T> {
  const ctx = Object.assign(
    createPWAContext('vite-legacy', userOptions) as VitePWAPluginContext<'vite-legacy', UserStrategy, T>,
    {
      viteConfig: undefined!,
      envApi: false,
    },
  )

  ctx.injectManifestSWAtPublicDir = injectManifestSWAtPublicDir(ctx)
  ctx.customPwaAssetResolver = pwaAssetsResolver(ctx)

  return ctx
}
