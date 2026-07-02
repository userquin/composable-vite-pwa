import type { ConfigurePWAOptions, ExtractStrategy } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type {
  BasePartial,
  GlobPartial,
  ManifestTransform,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { AstroPWAContext } from './create-context'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

export function prepareBuildContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: AstroPWAContext<UserStrategy, T>,
  resolvedConfig: import('vite').ResolvedConfig,
): ConfigurePWAOptions | undefined {
  const { base, vite, output, build, outDir, publicDir, root } = ctx.astro.config
  const server = output === 'server'

  console.log(outDir)

  // server implies dist/client and dist/server: we need to change sw build to use client folder
  if (server) {
    ctx.outDir = normalizePath(path.resolve(fileURLToPath(build.client)))
  }
  else {
    ctx.outDir = normalizePath(path.resolve(fileURLToPath(outDir)))
  }
  ctx.resolvedOptions.outDir = ctx.outDir
  if (ctx.outDir.at(-1) === '/') {
    ctx.outDir = ctx.outDir.slice(0, ctx.outDir.length - 1)
  }
  console.log(ctx.outDir)

  let options: Partial<BasePartial & GlobPartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.generateSW
      if (!('navigateFallback' in ctx.resolvedOptions.generateSW!)) {
        ctx.resolvedOptions.generateSW!.navigateFallback = base ?? vite.base ?? '/'
      }
      if (ctx.astro.useDirectoryFormat) {
        ctx.resolvedOptions.generateSW!.directoryIndex = 'index.html'
      }
      break
    case 'inject-manifest':
      ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.injectManifest
      break
    case 'build-sw':
      ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<ExtractStrategy<UserStrategy>, T>
      options = ctx.resolvedOptions.buildSW
      break
  }

  const cwd = normalizePath(path.resolve(fileURLToPath(root)))
  console.log(ctx.outDir, cwd)
  const immutableAssets = resolvedConfig.build.assetsDir ?? '_astro/'

  if (!options) {
    return {
      cwd: cwd.at(-1) === '/' ? cwd.slice(0, ctx.outDir.length - 1) : cwd,
      outDir: ctx.outDir,
      immutableAssets,
    }
  }

  options.globDirectory = ctx.outDir

  if (!('globPatterns' in options)) {
    options.globPatterns = ['**/*.{js,css,html}']
  }

  if (ctx.resolvedOptions.pwaAssets) {
    ctx.resolvedOptions.pwaAssets.integration = {
      baseUrl: base ?? vite.base ?? '/',
      publicDir: fileURLToPath(publicDir),
      outDir: ctx.outDir,
    }
  }

  if (!options.manifestTransforms) {
    options.manifestTransforms = options.manifestTransforms ?? []
    options.manifestTransforms.push(
      ctx.astro.experimental?.directoryAndTrailingSlashHandler === true
        ? createExperimentalManifestTransform(ctx)
        : createManifestTransform(ctx),
    )
  }

  // astro use the same vite folder
  return {
    cwd,
    outDir: ctx.outDir,
    immutableAssets,
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

function createManifestTransform(ctx: AstroPWAContext<any, any>): ManifestTransform {
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

function createExperimentalManifestTransform(ctx: AstroPWAContext<any, any>): ManifestTransform {
  return async (entries) => {
    const { doBuild, trailingSlash, scope, useDirectoryFormat } = ctx.astro
    if (!doBuild) {
      return { manifest: entries, warnings: [] }
    }

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

        if (trailingSlash === 'always') {
          newUrl += '/'
        }

        additionalEntries.push({
          revision: e.revision,
          url: newUrl,
          size: e.size,
        })
      }
    })

    if (additionalEntries.length) {
      entries.push(...additionalEntries)
    }

    return { manifest: entries, warnings: [] }
  }
}
