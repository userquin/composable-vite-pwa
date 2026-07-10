import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import { hash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import { lstat } from 'node:fs/promises'
import { createResolver } from '@nuxt/kit'
import { resolve } from 'pathe'
import semver from 'semver'

export async function prepareResolvedPwaOptions<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
  outDir: string,
) {
  let config: Partial<
    import('@composable-vite-pwa/workbox-build/types').BasePartial
      & import('@composable-vite-pwa/workbox-build/types').GlobPartial
      & import('@composable-vite-pwa/workbox-build/types').RequiredGlobDirectoryPartial
  >

  if (ctx.resolvedOptions.strategy === 'build-sw') {
    const resolver = createResolver(import.meta.filename)
    ctx.resolvedOptions.buildSW!.swSrc = await resolver.resolvePath(ctx.resolvedOptions.buildSW!.swSrc)
    config = ctx.resolvedOptions.buildSW!
  }
  else {
    ctx.resolvedOptions.generateSW ??= {}
    const generateSW = ctx.resolvedOptions.generateSW!
    if (
      ctx.resolvedOptions.registerType === 'autoUpdate'
      && (
        ctx.nuxt.client.registerPlugin
        || ctx.resolvedOptions.injectRegister === 'script'
        || ctx.resolvedOptions.injectRegister === 'inline'
      )
    ) {
      generateSW.clientsClaim = true
      generateSW.skipWaiting = true
    }
    if (nuxt.options.dev) {
      // on dev force always to use the root
      generateSW.navigateFallback = generateSW.navigateFallback ?? nuxt.options.app.baseURL ?? '/'
      const devOptions = ctx.resolvedOptions.devOptions
      if (devOptions?.enabled && !devOptions.navigateFallbackAllowlist) {
        const baseURL = nuxt.options.app.baseURL
        // fix #214
        devOptions.navigateFallbackAllowlist = [baseURL
          ? new RegExp(`^${baseURL.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}$`)
          : /^\/$/]
      }
    }
    // the user may want to disable offline support
    if (!('navigateFallback' in generateSW)) {
      generateSW.navigateFallback = ctx.base
      // generateSW.navigateFallback = nuxt.options.app.baseURL ?? '/'
    }

    config = generateSW
  }

  if (!nuxt.options.dev) {
    config.globDirectory = outDir
  }

  if (!('globPatterns' in config)) {
    config.globPatterns = ['**/*.{js,css,html}']
  }

  const buildAssetsDir = ctx.nuxt.buildAssetsDir

  // Vite 5 support: allow override dontCacheBustURLsMatching
  if (!('dontCacheBustURLsMatching' in config)) {
    config.dontCacheBustURLsMatching = new RegExp(buildAssetsDir)
  }

  // handle payload extraction
  if (ctx.nuxt.enableGlobPatterns) {
    config.globPatterns = config.globPatterns ?? []
    config.globPatterns.push('**/_payload.json')
    if (ctx.resolvedOptions.strategy === 'generate-sw' && ctx.nuxt.experimental?.enableWorkboxPayloadQueryParams) {
      const generateSW = ctx.resolvedOptions.generateSW!

      generateSW.runtimeCaching = generateSW.runtimeCaching ?? []
      generateSW.runtimeCaching.push({
        urlPattern: /\/_payload\.json\?/,
        handler: 'NetworkOnly',
        options: {
          plugins: [{
            /* this callback will be called when the fetch call fails */
            handlerDidError: async ({ request }) => {
              const url = new URL(request.url)
              url.search = ''
              return Response.redirect(url.href, 302)
            },
            /* this callback will prevent caching the response */
            cacheWillUpdate: async () => null,
          }],
        },
      })
    }
  }

  // handle Nuxt App Manifest
  let appManifestFolder: string | undefined
  if (semver.gte(ctx.nuxt.nuxtVersion, '3.8.0') && nuxt.options.experimental.appManifest) {
    config.globPatterns = config.globPatterns ?? []
    appManifestFolder = `${buildAssetsDir}builds/`
    config.globPatterns.push(`${appManifestFolder}**/*.json`)
  }

  // allow override manifestTransforms
  if (!nuxt.options.dev && !config.manifestTransforms) {
    config.manifestTransforms = [createManifestTransform(ctx.base ?? '/', outDir, appManifestFolder)]
  }

  if (ctx.resolvedOptions.pwaAssets) {
    ctx.resolvedOptions.pwaAssets.integration = {
      baseUrl: ctx.base ?? '/',
      publicDir: ctx.publicDir,
      outDir,
    }
  }
}

function createManifestTransform(
  base: string,
  publicFolder: string,
  appManifestFolder?: string,
): import('@composable-vite-pwa/workbox-build/types').ManifestTransform {
  return async (entries) => {
    // todo: change this and use loop
    const regexp = /\.html$/
    entries.filter(e => e.url.endsWith('.html')).forEach((e) => {
      const url = e.url.startsWith('/') ? e.url.slice(1) : e.url
      if (url === 'index.html') {
        e.url = base
      }
      else {
        const parts = url.split('/')
        parts[parts.length - 1] = parts[parts.length - 1]!.replace(regexp, '')
        e.url = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : parts[0] as string
      }
    })

    if (appManifestFolder) {
      // this shouldn't be necessary, since we are using dontCacheBustURLsMatching
      // eslint-disable-next-line regexp/no-unused-capturing-group,regexp/no-useless-assertions
      const regExp = /(\/)?[0-9a-f]{8}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{4}\b-[0-9a-f]{12}\.json$/i
      // we need to remove the revision from the sw prechaing manifest, UUID is enough:
      // we don't use dontCacheBustURLsMatching, single regex
      entries.filter(e => e.url.startsWith(appManifestFolder) && regExp.test(e.url)).forEach((e) => {
        e.revision = null
      })
      // add revision to latest.json file: we are excluding `_nuxt/` assets from dontCacheBustURLsMatching
      const latest = `${appManifestFolder}latest.json`
      const latestJson = resolve(publicFolder, latest)
      const data = await lstat(latestJson).catch(() => undefined)
      if (data?.isFile()) {
        const revision = hash('md5', await fs.readFile(latestJson, 'utf-8'), 'hex')
        const latestEntry = entries.find(e => e.url === latest)
        if (latestEntry)
          latestEntry.revision = revision
        else
          entries.push({ url: latest, revision, size: data.size })
      }
      else {
        entries = entries.filter(e => e.url !== latest)
      }
    }

    return { manifest: entries, warnings: [] }
  }
}
