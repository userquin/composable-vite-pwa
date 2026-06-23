import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { InjectManifestStrategyOptions, SelfDestroyingStrategyOptions, Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { BuildResult, SWType } from '@composable-vite-pwa/workbox-build/types'
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

export type PwaAsset = 'register-sw' | 'virtual-register-sw'
export type AddHMRToPwaAsset = (
  asset: PwaAsset,
  code: string,
  // the type of virtual when asset is virtual-register-sw
  source?: string,
) => string | Promise<string>

export interface PWABuildDevContext<
  B extends Bundler,
  T extends SWType,
> {
  options: {
    swName: string
    swType: WorkerType
    swGenerated: boolean
    registerSWGenerated: boolean
    navigateFallbackAllowlist?: RegExp[]
    swAssetsPaths: Map<string, string>
    tempFolder: string
    swNames: {
      name: string
      classic: string
      module: string
      path: string
      classicPath: string
      modulePath: string
      devSWDest: string
    }
    globDirectory: string
  }
  addHMRToPwaAsset?: AddHMRToPwaAsset
  generateSW: (options: Partial<BuildGenerateSWOptions<T>>) => Promise<BuildResult>
  buildSW: (options: Partial<BuildSWType<B, T>>) => Promise<BuildResult>
  injectManifest: (options: Partial<InjectManifestStrategyOptions>) => Promise<BuildResult>
  selfDestroyingSW: (options: SelfDestroyingStrategyOptions) => Promise<boolean>
}
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
  resolvedOptions: Partial<ResolvedVitePWAOptions<S, T>>
  useImportRegister: boolean
  devEnvironment: boolean
  pwaAssetsGenerator: Promise<PWAAssetsGenerator | undefined>
  build: PWABuildContext
  dev: PWABuildDevContext<B, T>
  publicDir: string
  rootDir: string
  outDir: string
  base: string
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
  registerSWData: () => Promise<RegisterSWData | undefined>
  runBuild: () => Promise<void>
}
