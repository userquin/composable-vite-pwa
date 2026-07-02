import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, PWAPluginContext } from './context-types'
import type { VitePWAOptions, VitePWAStrategy } from './types'
import process from 'node:process'
import pkg from '../../package.json' with { type: 'json' }
import { preparePWAContext } from './prepare-pwa-context'

export function createPWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  bundler: B,
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<B, UserStrategy, T> {
  return preparePWAContext({
    bundler,
    version: pkg.version,
    strategy: undefined!,
    consumerOptions: userOptions,
    externalConfigurationLoader: false,
    resolvedOptions: undefined!,
    useImportRegister: false,
    devEnvironment: false,
    isPreview: false,
    pwaAssetsGenerator: Promise.resolve(undefined!),
    build: undefined!,
    dev: undefined!,
    base: undefined!,
    swNames: {
      hasNames: false,
      name: '',
      classic: '',
      module: '',
    },
    sources: new Set(),
    outDir: undefined!,
    publicDir: undefined!,
    rootDir: process.cwd(),
    customPwaAssetResolver: undefined!,
    webManifestData: undefined!,
    registerSWData: undefined!,
    runBuild: undefined!,
  })
}

export function createVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'vite', UserStrategy, T> {
  return createPWAContext('vite', userOptions)
}
export function createViteLegacyPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'vite-legacy', UserStrategy, T> {
  return createPWAContext('vite-legacy', userOptions)
}
export function createWebpackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'webpack', UserStrategy, T> {
  return createPWAContext('webpack', userOptions)
}
export function createRspackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'rspack', UserStrategy, T> {
  return createPWAContext('rspack', userOptions)
}
