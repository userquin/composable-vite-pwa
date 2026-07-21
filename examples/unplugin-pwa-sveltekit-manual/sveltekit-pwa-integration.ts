import type {
  ConfigurePWAOptionsFn,
  ExtractStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAOptions,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { ViteBundler, VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  BasePartial,
  GlobPartial,
  ManifestEntry,
  ManifestTransform,
  OptionalGlobDirectoryPartial,
  RequiredGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Adapter } from '@sveltejs/kit'
import type { Plugin, PluginOption, ResolvedConfig } from 'vite'
import { hash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { generateWebManifest } from '@composable-vite-pwa/unplugin-pwa/node/generate-web-manifest'
import { BuildRegisterSWPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { DevtoolsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/devtools'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { InspectorPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/inspector'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import {
  createVitePWAContext,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import { VERSION } from '@sveltejs/kit'
import { sveltekit } from '@sveltejs/kit/vite'
import semver from 'semver'

export interface KitOptions {
  /**
   * @see https://kit.svelte.dev/docs/adapter-static#options-fallback
   */
  adapterFallback?: string

  /**
   * Check your SvelteKit version, `trailingSlash` should be used in `+page[jt]s` files or `+layout.[jt]s.
   * @default 'never'
   */
  trailingSlash?: 'never' | 'always' | 'ignore'

  /**
   * Include `${appDir}/version.json` in the service worker precache manifest?
   *
   * @default false
   */
  includeVersionFile?: boolean

  /**
   * Enable SPA mode for the application.
   *
   * By default, the plugin will use `adapterFallback` to include the entry in the service worker
   * precache manifest.
   *
   * If you are using a logical name for the fallback, you can use the object syntax with the
   * `fallbackMapping`.
   *
   * For example, if you're using `fallback: 'app.html'` in your static adapter and your server
   * is redirecting to `/app`, you can configure `fallbackMapping: '/app'`.
   *
   * Since the static adapter will run after the PWA plugin generates the service worker,
   * the PWA plugin doesn't have access to the adapter fallback page to include the revision in the
   * service worker precache manifest.
   * To generate the revision for the fallback page, the PWA plugin will use the
   * `.svelte-kit/output/client/_app/version.json` file.
   * You can configure the `fallbackRevision` to generate a custom revision.
   *
   * @see https://svelte.dev/docs/kit/single-page-apps
   */
  spa?: true | {
    fallbackMapping?: string
    fallbackRevision?: () => Promise<string>
  }
}

export type SvelteKitPWAOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAOptions<UserStrategy, T> & {
  kit?: KitOptions
}

function SvelteKitAdapterWrapper<
  UserStrategy extends VitePWAStrategy,
  B extends ViteBundler,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<B, UserStrategy, T>,
  adapter?: Adapter,
): Adapter {
  const { adapt, ...options } = adapter ?? {}
  return Object.assign(
    options,
    {
      async adapt(builder) {
        await ctx.runBuild()
        return await adapt?.(builder)
      },
    } as Partial<Adapter>,
  ) as Adapter
}

export type SvelteKitConfig = Parameters<typeof sveltekit>[0]

export function withPwa<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  config: SvelteKitConfig = {},
  options: Partial<SvelteKitPWAOptions<UserStrategy, T>> = {},
) {
  const ctx = createSvelteKitPWAContext<UserStrategy, T>(
    config,
    options,
  )

  return [
    sveltekit(Object.assign(
      config,
      {
        adapter: SvelteKitAdapterWrapper(ctx, config.adapter),
      },
    )),
    SvelteKitPlugin(ctx),
  ]
}

interface SvelteKitPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> extends VitePWAPluginContext<'vite', UserStrategy, T> {
  kitConfig?: SvelteKitConfig
  kitOptions?: KitOptions
}

function createSvelteKitPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  config: SvelteKitConfig = {},
  options: Partial<SvelteKitPWAOptions<UserStrategy, T>> = {},
): SvelteKitPWAContext<UserStrategy, T> {
  const envApi = semver.major(VERSION) > 2
  const { kit, ...rest } = options || {}
  const ctx = Object.assign(
    createVitePWAContext(envApi, rest),
    {
      hmrRequiresSwitcher: true,
      kitConfig: config,
      kitOptions: kit,
    },
  ) as SvelteKitPWAContext<UserStrategy, T>

  ctx.configurePWAOptions = createPWAConfigurer(ctx)

  return ctx
}

function SvelteKitPlugin<
  B extends ViteBundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<B, UserStrategy, T>,
): PluginOption {
  return [
    MainPlugin(ctx),
    InfoPlugin(ctx),
    DevPlugin(ctx),
    DevMiddlewarePlugin(ctx),
    DevAssetsMiddlewarePlugin(ctx),
    AssetsPlugin(ctx),
    BuildRegisterSWPlugin(ctx),
    SvelteKitBuildPlugin(ctx),
    DevtoolsPlugin(ctx),
    InspectorPlugin(ctx),
  ]
}

function SvelteKitBuildPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
): Plugin {
  return {
    name: 'vite-pwa:sveltekit:build',
    enforce: 'post',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    async generateBundle(_, bundle) {
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }

      const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
      if (pwaAssetsGenerator) {
        pwaAssetsGenerator.injectManifestIcons()
      }

      if (ctx.resolvedOptions.manifest) {
        if (typeof this !== 'undefined' && typeof this.emitFile !== 'undefined') {
          this.emitFile({
            type: 'asset',
            fileName: ctx.resolvedOptions.manifestFilename,
            source: generateWebManifest(ctx),
          })
        }
        else {
          // NOTE: assigning to bundle[foo] directly is discouraged by rollup
          // and is not supported by rolldown.
          // The api consumers should pass in the pluginCtx in the future
          bundle[ctx.resolvedOptions.manifestFilename!] = {
            // @ts-expect-error: for Vite 3 support, Vite 4 has removed `isAsset` property
            isAsset: true,
            type: 'asset',
            // vite 6 deprecation: replaced with names
            name: undefined,
            // fix vite 6 build with manifest enabled
            names: [],
            source: generateWebManifest(ctx),
            fileName: ctx.resolvedOptions.manifestFilename!,
          }
        }
      }
    },
  }
}

function createManifestTransform(
  base: string,
  outDir: string,
  webManifestName?: string,
  options?: KitOptions,
): ManifestTransform {
  return async (entries) => {
    const defaultAdapterFallback = 'prerendered/fallback.html'
    const suffix = options?.trailingSlash === 'always' ? '/' : ''
    let adapterFallback = options?.adapterFallback
    let excludeFallback = false
    // the fallback will always be generated by SvelteKit.
    // The adapter will copy the fallback only if it is provided in its options: we need to exclude it
    if (!adapterFallback) {
      adapterFallback = defaultAdapterFallback
      excludeFallback = true
    }

    // the fallback will be always in .svelte-kit/output/prerendered/fallback.html
    const manifest = entries
      .filter(({ url }) => !(excludeFallback && url === defaultAdapterFallback))
      .map((e) => {
        let url = e.url
        // client assets in `.svelte-kit/output/client` folder.
        // SSG pages in `.svelte-kit/output/prerendered/pages` folder.
        // static adapter with load functions in `.svelte-kit/output/prerendered/dependencies/<page>/__data.json`.
        // fallback page in `.svelte-kit/output/prerendered` folder (fallback.html is the default).
        if (url.startsWith('client/')) {
          url = url.slice(7)
        }
        else if (url.startsWith('prerendered/dependencies/')) {
          url = url.slice(25)
        }
        else if (url.startsWith('prerendered/pages/')) {
          url = url.slice(18)
        }
        else if (url === defaultAdapterFallback) {
          url = adapterFallback!
        }

        if (url.endsWith('.html')) {
          if (url.startsWith('/')) {
            url = url.slice(1)
          }

          if (url === 'index.html') {
            url = base
          }
          else {
            const idx = url.lastIndexOf('/')
            if (idx > -1) {
              // abc/index.html -> abc/?
              if (url.endsWith('/index.html')) {
                url = `${url.slice(0, idx)}${suffix}`
                // abc/def.html -> abc/def/?
              }
              else {
                url = `${url.substring(0, url.lastIndexOf('.'))}${suffix}`
              }
            }
            else {
              // xxx.html -> xxx/?
              url = `${url.substring(0, url.lastIndexOf('.'))}${suffix}`
            }
          }
        }

        e.url = url

        return e
      })

    if (options?.spa && options?.adapterFallback) {
      const name = typeof options.spa === 'object' && options.spa.fallbackMapping
        ? options.spa.fallbackMapping
        : options.adapterFallback
      if (typeof options.spa === 'object' && typeof options.spa.fallbackRevision === 'function') {
        manifest.push({
          url: name,
          revision: await options.spa.fallbackRevision(),
          size: 0,
        })
      }
      else {
        manifest.push(await buildManifestEntry(
          name,
          path.resolve(outDir, 'client/_app/version.json'),
        ))
      }
    }

    if (!webManifestName) {
      return { manifest }
    }

    return { manifest: manifest.filter(e => e.url !== webManifestName) }
  }
}

function buildGlobPatterns(globPatterns?: string[]) {
  if (globPatterns) {
    if (!globPatterns.some(g => g.startsWith('prerendered/'))) {
      globPatterns.push('prerendered/**/*.{html,json}')
    }

    if (!globPatterns.some(g => g.startsWith('client/'))) {
      globPatterns.push('client/**/*.{js,css,ico,png,svg,webp,webmanifest}')
    }

    if (!globPatterns.some(g => g.includes('webmanifest'))) {
      globPatterns.push('client/*.webmanifest')
    }

    return globPatterns
  }

  return ['client/**/*.{js,css,ico,png,svg,webp,webmanifest}', 'prerendered/**/*.{html,json}']
}

function buildGlobIgnores(globIgnores?: string[]) {
  if (globIgnores) {
    if (!globIgnores.some(g => g.startsWith('server/'))) {
      globIgnores.push('server/**')
    }

    return globIgnores
  }

  return ['**/node_modules/**/*', 'server/**']
}

async function buildManifestEntry(url: string, path: string): Promise<ManifestEntry & { size: number }> {
  return {
    url,
    size: 0,
    revision: hash('md5', await fs.readFile(path, 'utf-8'), 'hex'),
  }
}

function prepareEnv<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  forClient: boolean,
  config: ResolvedConfig,
  forBuild: boolean,
  ctx: SvelteKitPWAContext<UserStrategy, T>,
) {
  const { kitConfig = {} } = ctx
  // todo: review this, check log when running dev
  if (kitConfig.experimental?.explicitEnvironmentVariables === true) {

  }
  // console.log(kitConfig)
  // console.log(config.resolve.alias)
}

function createPWAConfigurer<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: SvelteKitPWAContext<UserStrategy, T>,
): ConfigurePWAOptionsFn {
  const {
    kitConfig = {},
    kitOptions = {},
  } = ctx
  return (forClient, config) => {
    const buildCommand = config.command === 'build'
    prepareEnv(forClient, config, buildCommand, ctx)
    if (!buildCommand) {
      return undefined
    }
    const { appDir = '_app/' } = kitConfig ?? {}
    const sveltekitOutDir = path.resolve(process.cwd(), '.svelte-kit')

    ctx.resolvedOptions.includeManifestIcons = false
    ctx.resolvedOptions.includeManifest = false
    ctx.resolvedOptions.includeManifestScreenshots = false
    ctx.resolvedOptions.includeManifestShortcutIcons = false

    let options: Partial<
        BasePartial & GlobPartial & (OptionalGlobDirectoryPartial | RequiredGlobDirectoryPartial) & RequiredSWDestPartial
    > | undefined

    switch (ctx.strategy) {
      case 'generate-sw':
        ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<ExtractStrategy<UserStrategy>, T>
        if (!('navigateFallback' in ctx.resolvedOptions.generateSW!)) {
          ctx.resolvedOptions.generateSW!.navigateFallback = kitOptions.adapterFallback ?? ctx.base
        }
        options = ctx.resolvedOptions.generateSW
        break
      case 'inject-manifest':
        ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<ExtractStrategy<UserStrategy>, T>
        options = ctx.resolvedOptions.injectManifest
        break
      case 'build-sw':
        ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<ExtractStrategy<UserStrategy>, T>
        options = ctx.resolvedOptions.buildSW
        // todo: finish alias, ask sapphi-red
        // add vite/rolldown aliases
        /* if (ctx.bundler === 'vite') {
          const viteOptions = options as import('@composable-vite-pwa/workbox-build/build/vite/types').ServiceWorkerOptions
          const viteAlias = viteOptions.alias ?? {}
          Object.assign(
            options!,
            { alias: ctx.viteConfig.resolve?.alias ?? {} },
            { alias: viteAlias },
          )
        }
        else {
          const rolldownOptions = options as import('@composable-vite-pwa/workbox-build/build/rolldown/types').ServiceWorkerOptions
          const viteAlias = rolldownOptions.alias ?? {}
          Object.assign(
            options!,
            { alias: ctx.viteConfig.resolve?.alias ?? {} },
            { alias: viteAlias },
          )
        } */
        break
    }

    let buildAssetsDir = appDir
    if (buildAssetsDir[0] === '/') {
      buildAssetsDir = buildAssetsDir.slice(1)
    }
    if (buildAssetsDir[buildAssetsDir.length - 1] !== '/') {
      buildAssetsDir += '/'
    }

    const clientOutDir = path.resolve(sveltekitOutDir, 'output/client')
    ctx.publicDir = clientOutDir

    if (ctx.resolvedOptions.pwaAssets) {
      ctx.resolvedOptions.pwaAssets.integration = {
        baseUrl: ctx.base,
        publicDir: ctx.publicDir,
        outDir: clientOutDir,
      }
    }

    if (!options) {
      return {
        outDir: clientOutDir,
        cwd: process.cwd(),
        immutableAssets: `${buildAssetsDir}immutable/`,
      }
    }
    // SvelteKit outDir is `.svelte-kit/output/client`.
    // We need to include the parent folder since SvelteKit will generate SSG inside `.svelte-kit/output/prerendered` folder.
    if (!('globDirectory' in options)) {
      Object.assign(options, { globDirectory: `${sveltekitOutDir}/output` })
    }

    if (!options.modifyURLPrefix) {
      options.globPatterns = buildGlobPatterns(options.globPatterns)
      if (kitOptions.includeVersionFile) {
        options.globPatterns.push(`client/${buildAssetsDir}version.json`)
      }
    }

    // exclude server assets: sw is built on SSR build
    options.globIgnores = buildGlobIgnores(options.globIgnores)

    if (!options.manifestTransforms) {
      options.manifestTransforms = [createManifestTransform(
        ctx.base,
        options.globDirectory as string,
        ctx.strategy !== 'generate-sw'
          ? undefined
          : (ctx.resolvedOptions.manifestFilename ?? 'manifest.webmanifest'),
        kitOptions,
      )]
    }

    return {
      outDir: clientOutDir,
      cwd: process.cwd(),
      immutableAssets: `${buildAssetsDir}immutable/`,
    }
  }
}
