import type { ConfigurePWAOptionsFn } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type { ManifestTransform, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { AstroConfig } from 'astro'
import type { AstroExperimentalOptions, AstroPWAOptions } from './types'
import { fileURLToPath } from 'node:url'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'

export interface AstroPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends VitePWAPluginContext<'vite', UserStrategy, T> {
  astro: {
    config: AstroConfig
    devEnvironment: boolean
    previewOrSync: boolean
    doBuild: boolean
    scope: string
    useDirectoryFormat: boolean
    trailingSlash: 'never' | 'always' | 'ignore'
    experimental?: AstroExperimentalOptions
  }
}

export function createAstroPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<AstroPWAOptions<UserStrategy, T>>,
): AstroPWAContext<UserStrategy, T> {
  const { experimental, ...rest } = options || {}

  const ctx = Object.assign(
    createVitePWAContext(true, rest),
    {
      hmrRequiresSwitcher: true,
      astro: {
        config: undefined!,
        devEnvironment: false,
        previewOrSync: false,
        doBuild: false,
        scope: '/',
        trailingSlash: 'ignore',
        useDirectoryFormat: true,
        experimental,
      },
    },
  ) as AstroPWAContext<UserStrategy, T>

  ctx.configurePWAOptions = createPWAConfigurer(ctx)

  return ctx
}

function _createManifestTransform(ctx: AstroPWAContext<any, any>): ManifestTransform {
  return async (entries) => {
    const { doBuild, trailingSlash, scope, useDirectoryFormat } = ctx.astro
    if (!doBuild)
      return { manifest: entries, warnings: [] }

    // apply transformation only when build enabled
    entries.filter(e => e && e.url.endsWith('.html')).forEach((e) => {
      const url = e.url.startsWith('/') ? e.url.slice(1) : e.url
      if (url === 'index.html') {
        e.url = scope
      }
      else {
        const parts = url.split('/')
        parts[parts.length - 1] = parts[parts.length - 1].replace(/\.html$/, '')
        e.url = useDirectoryFormat
          ? parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : parts[0]
          : parts.join('/')

        if (trailingSlash === 'always')
          e.url += '/'
      }
    })

    return { manifest: entries, warnings: [] }
  }
}

function _createExperimentalManifestTransform(ctx: AstroPWAContext<any, any>): ManifestTransform {
  return async (entries) => {
    const { doBuild, trailingSlash, scope, useDirectoryFormat } = ctx.astro
    if (!doBuild)
      return { manifest: entries, warnings: [] }

    const additionalEntries: Parameters<ManifestTransform>[0] = []

    // apply transformation only when build enabled
    entries.filter(e => e && e.url.endsWith('.html')).forEach((e) => {
      const url = e.url.startsWith('/') ? e.url.slice(1) : e.url
      if (url === 'index.html') {
        additionalEntries.push({
          revision: e.revision,
          url: scope,
          size: e.size,
        })
      }
      else if (url === '404.html') {
        e.url = `404${trailingSlash === 'always' ? '/' : ''}`
      }
      else {
        const parts = url.split('/')
        parts[parts.length - 1] = parts[parts.length - 1].replace(/\.html$/, '')
        let newUrl = useDirectoryFormat
          ? parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : parts[0]
          : parts.join('/')

        if (trailingSlash === 'always')
          newUrl += '/'

        additionalEntries.push({
          revision: e.revision,
          url: newUrl,
          size: e.size,
        })
      }
    })

    if (additionalEntries.length)
      entries.push(...additionalEntries)

    return { manifest: entries, warnings: [] }
  }
}

function createPWAConfigurer<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: AstroPWAContext<UserStrategy, T>,
): ConfigurePWAOptionsFn {
  return () => {
    if (ctx.astro.devEnvironment) {
      ctx.devEnvironment = true
      return undefined
    }

    ctx.resolvedOptions.includeManifestIcons = false
    ctx.resolvedOptions.includeManifest = false
    ctx.resolvedOptions.includeManifestScreenshots = false
    ctx.resolvedOptions.includeManifestShortcutIcons = false

    const { base, vite, output, build, publicDir, outDir } = ctx.astro.config
    const server = output === 'server'

    if (server) {
      ctx.outDir = fileURLToPath(build.client)
      ctx.resolvedOptions.outDir = ctx.outDir
    }

    if (ctx.resolvedOptions.pwaAssets) {
      ctx.resolvedOptions.pwaAssets.integration = {
        baseUrl: base ?? vite.base ?? '/',
        publicDir: fileURLToPath(publicDir),
        outDir: server ? ctx.outDir : fileURLToPath(outDir),
      }
    }
    /*
    const {
      strategies = 'generateSW',
      registerType = 'prompt',
      injectRegister,
      workbox = {},
      ...rest
    } = options

    let assets = config.build.assets ?? '_astro/'
    if (assets[0] === '/') {
      assets = assets.slice(1)
    }
    if (assets[assets.length - 1] !== '/') {
      assets += '/'
    }

    if (strategies === 'generateSW') {
      const useWorkbox = { ...workbox }
      const newOptions: Partial<VitePWAOptions> = {
        ...rest,
        strategies,
        registerType,
        injectRegister,
      }

      if (server) {
        useWorkbox.globDirectory = options.outDir
      }

      // the user may want to disable offline support
      if (!('navigateFallback' in useWorkbox))
        useWorkbox.navigateFallback = base ?? vite.base ?? '/'

      if (directoryFormat)
        useWorkbox.directoryIndex = 'index.html'

      newOptions.workbox = useWorkbox
      // Astro4/ Vite5 support: allow override dontCacheBustURLsMatching
      if (!('dontCacheBustURLsMatching' in newOptions.workbox))
        newOptions.workbox.dontCacheBustURLsMatching = new RegExp(assets)

      if (!newOptions.workbox.manifestTransforms) {
        newOptions.workbox.manifestTransforms = newOptions.workbox.manifestTransforms ?? []
        newOptions.workbox.manifestTransforms.push(
          options.experimental?.directoryAndTrailingSlashHandler === true
            ? createExperimentalManifestTransform(astroPWAContext)
            : createManifestTransform(astroPWAContext),
        )
      }
    }

    options.injectManifest = options.injectManifest ?? {}

    if (server) {
      options.injectManifest.globDirectory = options.outDir
    }

    // Astro4/ Vite5 support: allow override dontCacheBustURLsMatching
    if (!('dontCacheBustURLsMatching' in options.injectManifest))
      options.injectManifest.dontCacheBustURLsMatching = new RegExp(assets)

    if (!options.injectManifest.manifestTransforms) {
      options.injectManifest.manifestTransforms = options.injectManifest.manifestTransforms ?? []
      options.injectManifest.manifestTransforms.push(
        options.experimental?.directoryAndTrailingSlashHandler === true
          ? createExperimentalManifestTransform(astroPWAContext)
          : createManifestTransform(astroPWAContext),
      )
    } */
  }
}
