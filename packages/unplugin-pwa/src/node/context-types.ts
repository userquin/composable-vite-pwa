import type { BuildGenerateSWOptions, BuildWithSourcesResult } from '@composable-vite-pwa/workbox-build/build/types'
import type { InjectManifestStrategyOptions, SelfDestroyingStrategyOptions, Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { BuildResult, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { PWAAssetsGenerator } from './pwa-assets/types'
import type { RegisterSWData, ResolvedVitePWAOptions, VitePWAOptions, VitePWAStrategy, WebManifestData } from './types'

export type Bundler = 'vite' | 'vite-legacy' | 'webpack' | 'rspack'

export type BuildSWType<B extends Bundler, T extends SWType> = B extends 'vite'
  ? import('@composable-vite-pwa/workbox-build/build/vite/types').BuildServiceWorkerOptions<T>
  : B extends 'vite-legacy'
    ? import('@composable-vite-pwa/workbox-build/build/vite/legacy-types').LegacyBuildServiceWorkerOptions<T>
    : import('@composable-vite-pwa/workbox-build/build/rolldown/types').BuildServiceWorkerOptions<T>

export interface PWABuildContext {
  generateSW: () => Promise<BuildResult>
  buildSW: () => Promise<BuildResult>
  injectManifest: () => Promise<BuildResult>
  selfDestroyingSW: () => Promise<boolean>
}

export interface SWNames {
  hasNames: boolean
  name: string
  classic: string
  module: string
}

export interface DevSWNames extends SWNames {
  path: string
  classicPath: string
  modulePath: string
  devSWDest: string
}

/**
 * The type of PWA asset.
 */
export type PwaAsset = 'register-sw' | 'virtual-register-sw'
/**
 * Custom PWA asset resolver for `registerSW.js` and PWA virtual modules.
 *
 * When `virtual-register-sw` the virtualName won't be undefined:
 * - 'register' for `virtual:pwa-register`
 * - 'vue' for `virtual:pwa-register/vue`
 * - 'svelte' for `virtual:pwa-register/svelte`
 * - 'react' for `virtual:pwa-register/react`
 * - 'react-legacy' for `virtual:pwa-register/react-legacy`
 * - 'preact' for `virtual:pwa-register/preact`
 * - 'solid' for `virtual:pwa-register/solid`
 *
 * @param asset The asset type to resolve
 * @param virtualName The virtual module name when asset is `virtual-register-sw`
 * @return The generated PWA asset
 */
export type CustomPwaAssetResolver = (
  asset: PwaAsset,
  virtualName?: string,
) => Promise<string>

export interface PWABuildDevContext<
  B extends Bundler,
  T extends SWType,
> {
  options: {
    /**
     * The current service worker name.
     */
    swName: string
    /**
     * The current service worker type.
     */
    swType: WorkerType
    swGenerated: boolean
    registerSWGenerated: boolean
    registerVirtualSWGenerated: boolean
    hmrEntryPointGenerated: boolean
    navigateFallbackAllowlist?: RegExp[]
    swAssetsPaths: Map<string, string>
    tempFolder: string
    /**
     * Names and paths to resolve service workers.
     */
    swNames: DevSWNames
    /**
     * The globDirectory to cache only entry point.
     */
    globDirectory: string
  }
  generateSW: (options: Partial<BuildGenerateSWOptions<T>>) => Promise<BuildResult>
  buildSW: (options: Partial<BuildSWType<B, T>>) => Promise<BuildWithSourcesResult>
  injectManifest: (options: Partial<InjectManifestStrategyOptions>) => Promise<BuildResult>
  selfDestroyingSW: (options: SelfDestroyingStrategyOptions) => Promise<boolean>
}
export interface ConfigurePWAOptions {
  outDir: string
  /**
   * Used to generate the dontCache
   */
  immutableAssets: string
  cwd: string
}
export type ConfigurePWAOptionsFn = (
  forClient: boolean,
  config: ResolvedConfig,
) => ConfigurePWAOptions | undefined | Promise<ConfigurePWAOptions | undefined>

export interface PWAPluginContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
> {
  bundler: B
  version: string
  strategy: S
  consumerOptions: Partial<VitePWAOptions<UserStrategy, T>>
  configurePWAOptions?: ConfigurePWAOptionsFn
  externalConfigurationLoader: boolean
  resolvedOptions: Partial<ResolvedVitePWAOptions<S, T>>
  useImportRegister: boolean
  devEnvironment: boolean
  hmrRequiresSwitcher?: true
  pwaAssetsGenerator: Promise<PWAAssetsGenerator | undefined>
  build: PWABuildContext
  dev: PWABuildDevContext<B, T>
  publicDir: string
  rootDir: string
  outDir: string
  base: string
  sources: Set<string>
  swNames: SWNames
  /**
   * The custom resolver to resolve PWA assets for `registerSW.js` and virtual PWA modules.
   */
  customPwaAssetResolver: CustomPwaAssetResolver
  /**
   * Returns the PWA web manifest url for the manifest link:
   * <link rel="manifest" href="<webManifestUrl>" />
   *
   * Will also return if the manifest will require credentials:
   * <link rel="manifest" href="<webManifestUrl>" crossorigin="use-credentials" />
   */
  webManifestData: () => WebManifestData | undefined
  /**
   * How the service worker is being registered in the application.
   *
   * This option will help some integrations to inject the corresponding script in the head.
   */
  registerSWData: () => Promise<RegisterSWData & { module: boolean } | undefined>
  runBuild: () => Promise<BuildResult | boolean>
}
