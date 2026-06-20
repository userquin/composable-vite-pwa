import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, PWAPluginContext } from './context-types'
import type { VitePWAOptions, VitePWAStrategy } from './types'
import process from 'node:process'
import pkg from '../../package.json' with { type: 'json' }
import { preparePWAContext } from './prepare-pwa-context'

export function createPWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  bundler: B,
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<B, UserStrategy, S, T> {
  return preparePWAContext({
    bundler,
    version: pkg.version,
    strategy: undefined!,
    consumerOptions: userOptions,
    resolvedOptions: undefined!,
    useImportRegister: false,
    devEnvironment: false,
    pwaAssetsGenerator: Promise.resolve(undefined),
    build: undefined!,
    dev: undefined!,
    base: undefined!,
    outDir: undefined!,
    publicDir: undefined!,
    rootDir: process.cwd(),
    runBuild: undefined!,
  })
}

export function createVitePWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'vite', UserStrategy, S, T> {
  return createPWAContext('vite', userOptions)
}
export function createViteLegacyPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'vite-legacy', UserStrategy, S, T> {
  return createPWAContext('vite-legacy', userOptions)
}
export function createWebpackPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'webpack', UserStrategy, S, T> {
  return createPWAContext('webpack', userOptions)
}
export function createRspackPWAContext<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  userOptions: Partial<VitePWAOptions<UserStrategy, T>> = {},
): PWAPluginContext<'rspack', UserStrategy, S, T> {
  return createPWAContext('rspack', userOptions)
}
