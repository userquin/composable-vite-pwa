import type { BuildGenerateSWOptions } from '@composable-vite-pwa/workbox-build/build/types'
import type { LegacyBuildServiceWorkerOptions } from '@composable-vite-pwa/workbox-build/build/vite/legacy-types'
import type {
  InjectManifestStrategyOptions,
  SelfDestroyingStrategyOptions,
  Strategy,
} from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { BuildSWType, Bundler, PWAPluginContext } from './context-types'
import type { RegisterSWData, ResolvedVitePWAOptions, VitePWAStrategy, WebManifestData } from './types'
import { DEV_SW_NAME, FILE_SW_REGISTER } from './constants'
import { generateRegisterDevSW, generateRegisterSW, generateWebManifest } from './html'

export function preparePWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, S, T>) {
  ctx.webManifestData = () => {
    const options = ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>
    if (!options || options.disable || !options.manifest || (ctx.devEnvironment && !options.devOptions?.enabled))
      return undefined

    let url = options.manifestFilename
    let manifest: string
    if (ctx.devEnvironment && options.devOptions?.enabled === true) {
      url = options.manifestFilename
      manifest = generateWebManifest(options, true)
    }
    else {
      manifest = generateWebManifest(options, false)
    }

    return <WebManifestData>{
      href: `${ctx.devEnvironment ? options.base : options.buildBase}${url}`,
      useCredentials: options.useCredentials,
      toLinkTag: () => {
        return manifest
      },
    }
  }

  ctx.registerSWData = () => {
  // we'll return the info only when it is required
    // 1: exclude if not enabled
    const options = ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>
    if (!options || options.disable || (ctx.devEnvironment && !options.devOptions?.enabled))
      return undefined

    // 2: if manual registration or using virtual
    const mode = options.injectRegister
    if (!mode || ctx.useImportRegister)
      return undefined

    // 3: otherwise we always return the info
    let type: WorkerType = 'classic'
    let script: string | undefined
    let shouldRegisterSW = options.injectRegister === 'inline' || options.injectRegister === 'script' || options.injectRegister === 'script-defer'
    if (ctx.devEnvironment && options.devOptions?.enabled === true) {
      type = options.devOptions?.type ?? 'classic'
      script = generateRegisterDevSW(options.base!)
      shouldRegisterSW = true
    }
    else if (shouldRegisterSW) {
      script = generateRegisterSW(ctx, false)
    }

    const base = ctx.devEnvironment ? options.base : options.buildBase

    return <RegisterSWData>{
      // hint when required
      shouldRegisterSW,
      inline: options.injectRegister === 'inline',
      mode: mode === 'auto' ? 'script' : mode,
      scope: options.scope,
      inlinePath: `${base}${ctx.devEnvironment ? DEV_SW_NAME : options.filename}`,
      registerPath: `${base}${FILE_SW_REGISTER}`,
      type,
      toScriptTag: () => {
        return script
      },
    }
  }
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
