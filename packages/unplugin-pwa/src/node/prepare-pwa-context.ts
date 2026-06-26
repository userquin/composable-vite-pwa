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
import { createGenerateRegisterSW } from './create-generate-register-sw-script'
import { createWebManifestHtmlLink } from './create-web-manifest-html-link'
import { isDualServiceWorker } from './dual-sw-utilities'

export function preparePWAContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: PWAPluginContext<B, UserStrategy, S, T>) {
  ctx.pwaAssetsGenerator = Promise.resolve(undefined)
  // pwa web manifest always generated if present
  ctx.webManifestData = () => {
    const options = ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>
    if (!options.manifest)
      return undefined

    const url = options.manifestFilename
    const manifest = createWebManifestHtmlLink(ctx)

    return <WebManifestData>{
      href: `${ctx.devEnvironment ? options.base : options.buildBase}${url}`,
      useCredentials: options.useCredentials,
      toLinkTag: () => {
        return manifest
      },
    }
  }

  ctx.registerSWData = async () => {
  // we'll return the info only when it is required
    // 1: exclude if not enabled
    const options = ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>
    if (options.disable || (ctx.devEnvironment && !options.devOptions?.enabled))
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
      script = await createGenerateRegisterSW(ctx, true, true)
      shouldRegisterSW = true
    }
    else if (shouldRegisterSW) {
      script = await createGenerateRegisterSW(ctx, true, true)
    }

    const base = ctx.devEnvironment ? options.base : options.buildBase

    return <RegisterSWData & { module: boolean }>{
      // hint when required
      shouldRegisterSW,
      module: isDualServiceWorker(ctx),
      mode: mode === 'auto' ? 'script' : mode,
      scope: options.scope,
      // todo: review this, this may be wrong
      inlinePath: `${base}${ctx.devEnvironment ? DEV_SW_NAME : FILE_SW_REGISTER}`,
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
      swName: '',
      swGenerated: false,
      registerSWGenerated: false,
      registerVirtualSWGenerated: false,
      hmrEntryPointGenerated: false,
      swType: ctx.consumerOptions.swType === 'classic-and-module' ? 'classic' : (ctx.consumerOptions.swType ?? 'classic'),
      swAssetsPaths: new Map(),
      tempFolder: undefined!,
      swNames: {
        hasNames: false,
        name: '',
        classic: '',
        module: '',
        path: '',
        classicPath: '',
        modulePath: '',
        devSWDest: '',
      },
      globDirectory: '',
    },
    generateSW: async (options) => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            Object.assign({}, ctx.resolvedOptions.generateSW ?? {}, options) as BuildGenerateSWOptions<T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-generate-sw').then(({
            generateSWLegacy: runGenerateSWLegacy,
          }) => runGenerateSWLegacy(
            Object.assign({}, ctx.resolvedOptions.generateSW ?? {}, options) as LegacyBuildServiceWorkerOptions<T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/generate-sw').then(({
            generateSW: runGenerateSW,
          }) => runGenerateSW(
            Object.assign({}, ctx.resolvedOptions.generateSW ?? {}, options) as BuildGenerateSWOptions<T>,
          ))
      }
    },
    buildSW: async (options) => {
      switch (ctx.bundler) {
        case 'vite':
          return await import('@composable-vite-pwa/workbox-build/build/vite/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            Object.assign({}, ctx.resolvedOptions.buildSW ?? {}, options) as BuildSWType<'vite', T>,
          ))
        case 'vite-legacy':
          return await import('@composable-vite-pwa/workbox-build/build/vite/legacy-build-sw').then(({
            buildSWLegacy: runBuildSWLegacy,
          }) => runBuildSWLegacy(
            Object.assign({}, ctx.resolvedOptions.buildSW ?? {}, options) as BuildSWType<'vite-legacy', T>,
          ))
        case 'rspack':
        case 'webpack':
          return await import('@composable-vite-pwa/workbox-build/build/rolldown/build-sw').then(({
            buildSW: runBuildSW,
          }) => runBuildSW(
            ctx.bundler === 'webpack'
              ? Object.assign({}, ctx.resolvedOptions.buildSW ?? {}, options) as BuildSWType<'webpack', T>
              : Object.assign({}, ctx.resolvedOptions.buildSW ?? {}, options) as BuildSWType<'rspack', T>,
          ))
      }
    },
    injectManifest: options => import('@composable-vite-pwa/workbox-build/inject-manifest').then(({
      injectManifest: runInjectManifest,
    }) => runInjectManifest(
      Object.assign({}, ctx.resolvedOptions.injectManifest ?? {}, options) as InjectManifestStrategyOptions,
    )),
    selfDestroyingSW: options => import('@composable-vite-pwa/workbox-build/self-destroying-sw').then(({
      selfDestroyingSW: runSelfDestroyingSW,
    }) => runSelfDestroyingSW(
      options,
    )).then(() => Promise.resolve(true)),
  }

  ctx.runBuild = async () => {
    switch (ctx.strategy) {
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
