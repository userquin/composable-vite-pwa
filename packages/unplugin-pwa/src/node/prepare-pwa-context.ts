import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { LegacyBuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/vite/legacy-types'
import type {
  InjectManifestStrategyOptions,
  SelfDestroyingStrategyOptions,
  Strategy,
} from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { BuildSWType, Bundler, PWAPluginContext } from './context-types'
import type { VitePWAStrategy } from './types'
import { DEV_SW_NAME } from '@composable-vite-pwa/unplugin-pwa/constants'

export function preparePWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, S, T>) {
  ctx.build = {
    generateSW: async () => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            ctx.resolvedOptions.generateSW as BuildGenerateSWOptions<T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-generate-sw').then(({
            generateSWLegacy: runGenerateSWLegacy,
          }) => runGenerateSWLegacy(
            ctx.resolvedOptions.generateSW as LegacyBuildServiceWorkerOptions<T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            ctx.resolvedOptions.generateSW as BuildGenerateSWOptions<T>,
          ))
      }
    },
    buildSW: async () => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            ctx.resolvedOptions.buildSW as BuildSWType<'vite', T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-build-sw').then(({
            buildSWLegacy: runBuildSWLegacy,
          }) => runBuildSWLegacy(
            ctx.resolvedOptions.buildSW as BuildSWType<'vite-legacy', T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            ctx.bundler === 'webpack'
              ? ctx.resolvedOptions.buildSW as BuildSWType<'webpack', T>
              : ctx.resolvedOptions.buildSW as BuildSWType<'rspack', T>,
          ))
      }
    },
    injectManifest: () => import('@composable-vite-pwa/workbox-build/inject-manifest').then(({
      injectManifest: runInjectManifest,
    }) => runInjectManifest(
      ctx.resolvedOptions.injectManifest as InjectManifestStrategyOptions,
    )),
    selfDestroyingSW: () => import('@composable-vite-pwa/workbox-build/self-destroying-sw').then(({
      selfDestroyingSW: runSelfDestroyingSW,
    }) => runSelfDestroyingSW(
      ctx.resolvedOptions.selfDestroying as SelfDestroyingStrategyOptions,
    )).then(() => Promise.resolve(true)),
  }
  ctx.dev = {
    options: {
      swName: DEV_SW_NAME,
      swGenerated: false,
      registerSWGenerated: false,
      swType: ctx.consumerOptions.swType === 'classic-and-module' ? 'classic' : (ctx.consumerOptions.swType ?? 'classic'),
      swAssetsPaths: new Map(),
    },
    generateSW: async (options) => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            Object.assign({}, ctx.resolvedOptions.generateSW, options) as BuildGenerateSWOptions<T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-generate-sw').then(({
            generateSWLegacy: runGenerateSWLegacy,
          }) => runGenerateSWLegacy(
            Object.assign({}, ctx.resolvedOptions.generateSW, options) as LegacyBuildServiceWorkerOptions<T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            Object.assign({}, ctx.resolvedOptions.generateSW, options) as BuildGenerateSWOptions<T>,
          ))
      }
    },
    buildSW: async (options) => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            Object.assign({}, ctx.resolvedOptions.buildSW, options) as BuildSWType<'vite', T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-build-sw').then(({
            buildSWLegacy: runBuildSWLegacy,
          }) => runBuildSWLegacy(
            Object.assign({}, ctx.resolvedOptions.buildSW, options) as BuildSWType<'vite-legacy', T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            ctx.bundler === 'webpack'
              ? Object.assign({}, ctx.resolvedOptions.buildSW, options) as BuildSWType<'webpack', T>
              : Object.assign({}, ctx.resolvedOptions.buildSW, options) as BuildSWType<'rspack', T>,
          ))
      }
    },
    injectManifest: options => import('@composable-vite-pwa/workbox-build/inject-manifest').then(({
      injectManifest: runInjectManifest,
    }) => runInjectManifest(
      Object.assign({}, ctx.resolvedOptions.injectManifest, options) as InjectManifestStrategyOptions,
    )),
    selfDestroyingSW: options => import('@composable-vite-pwa/workbox-build/self-destroying-sw').then(({
      selfDestroyingSW: runSelfDestroyingSW,
    }) => runSelfDestroyingSW(
      options,
    )).then(() => Promise.resolve(true)),
  }

  ctx.runBuild = async () => {
    switch (ctx.resolvedOptions.strategy) {
      case 'self-destroy-sw':
        await ctx.build.selfDestroyingSW()
        break
      case 'build-sw':
        await ctx.build.buildSW()
        break
      case 'generate-sw':
        await ctx.build.generateSW()
        break
      case 'inject-manifest':
        await ctx.build.injectManifest()
        break
    }
  }

  return ctx
}
