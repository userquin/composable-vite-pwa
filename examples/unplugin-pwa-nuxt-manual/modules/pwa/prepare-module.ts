import type {
  Bundler,
  SWNames,
} from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import { existsSync, promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  prepareSwNamesAndGlobDirectory,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/dev/prepare-sw-names-and-glob-directory'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import {
  addComponent,
  addPlugin,
  createResolver,
} from '@nuxt/kit'
import { resolve } from 'pathe'
import semver from 'semver'
import { buildPwaAssets } from './build-pwa-assets'
import { prepareResolvedPwaOptions } from './prepare-resolved-pwa-options'
import { prepareBuildSwNames } from './prepare-sw-names'

export async function prepareModule<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPC,
  nuxt: Nuxt,
) {
  const resolver = createResolver(import.meta.url)
  const publicDirs = new Set<string>()
  for (const layer of nuxt.options._layers) {
    publicDirs.add(normalizePath(resolver.resolve(layer.config.rootDir, layer.config.dir?.public || 'public')))
  }

  ctx.nuxt.publicDirs = [...publicDirs].filter(dir => existsSync(dir))

  const consumerOptions = ctx.consumerOptions
  // resolve nuxt aliases
  if (consumerOptions?.path) {
    consumerOptions.path = await resolver.resolvePath(consumerOptions.path)
  }

  ctx.base = nuxt.options.runtimeConfig.public.base as string || '/'
  ctx.consumerOptions.base ??= ctx.base
  ctx.consumerOptions.scope ??= ctx.base
  ctx.externalConfigurationLoader = true

  const runtimeDir = resolver.resolve('./runtime')
  nuxt.options.build.transpile.push(runtimeDir)

  if (ctx.nuxt.client.registerPlugin) {
    addPlugin({
      src: resolver.resolve(runtimeDir, 'plugins/pwa.client'),
      mode: 'client',
    })
  }

  addComponent({
    name: 'NuxtPwaAssets',
    filePath: resolver.resolve(runtimeDir, 'components/NuxtPwaAssets'),
  })

  nuxt.hook('prepare:types', ({ references }) => {
    references.push({ path: resolver.resolve(runtimeDir, 'plugins/types') })
    references.push({ types: '../modules/pwa/configuration.d.ts' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/vue' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/info' })
    references.push({ types: '@composable-vite-pwa/unplugin-pwa/pwa-assets' })
  })

  // load pwa configuration
  await ctx.nuxt.loadPwaConfiguration()

  // init strategy
  ctx.strategy = ctx.resolvedOptions.strategy!

  nuxt.hook('nitro:config', async (nitroConfig) => {
    ctx.nuxt.nitroConfig = nitroConfig

    if (nuxt.options.experimental.payloadExtraction) {
      ctx.nuxt.enableGlobPatterns = nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */
        || (
          !!ctx.nuxt.nitroConfig.prerender?.routes?.length
          || Object.values(ctx.nuxt.nitroConfig.routeRules ?? {}).some(r => r.prerender)
        )
    }

    ctx.resolvedOptions.base = ctx.base
    ctx.resolvedOptions.scope = ctx.base
    ctx.resolvedOptions.buildBase = ctx.base
    ctx.useImportRegister = false

    const isDev = nuxt.options.dev
    let swDisabled = false
    if (nuxt.options.dev) {
      ctx.devEnvironment = true
      const internalDevOptions = ctx.dev.options!
      internalDevOptions.tempFolder = resolve(nuxt.options.buildDir, 'pwa/.dev-dist')
      ctx.outDir = internalDevOptions.tempFolder
      ctx.rootDir = nuxt.options.rootDir
      ctx.publicDir = nuxt.options.dir.public
      if (ctx.resolvedOptions.disable) {
        swDisabled = true
      }
      else {
        const devOptions = ctx.resolvedOptions.devOptions
        if (devOptions) {
          swDisabled = !(devOptions.enabled === true)
        }
        else {
          swDisabled = true
        }
      }
    }
    else {
      if (ctx.resolvedOptions.disable) {
        swDisabled = true
      }
      if (!swDisabled) {
        const publicDir = nitroConfig.output?.publicDir ?? nuxt.options.nitro?.output?.publicDir

        // todo: ask Daniel
        prepareBuildSwNames(
          ctx,
          publicDir ? path.resolve(process.cwd(), publicDir) : path.resolve(process.cwd(), './.output/public'),
        )
      }
    }

    const webManifest = ctx.resolvedOptions.manifest
    let swNames: SWNames | undefined

    // prepare nitro public assets
    if (isDev) {
      if (!swDisabled) {
        await prepareSwNamesAndGlobDirectory(ctx as unknown as any)
        swNames = ctx.dev.options!.swNames
        const outDir = path.resolve(
          nuxt.options.buildDir,
          'pwa/.dev-dist',
        )

        await fs.mkdir(outDir, { recursive: true })
        nitroConfig.publicAssets = nitroConfig.publicAssets || []
        nitroConfig.publicAssets.push({
          dir: outDir,
          fallthrough: true,
          baseURL: ctx.base,
          maxAge: 0,
        })
      }
    }
    else {
      swNames = ctx.swNames
    }

    nitroConfig.routeRules = nitroConfig.routeRules || {}
    if (swNames?.hasNames) {
      if (ctx.resolvedOptions.swType === 'classic-and-module') {
        nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.classic)}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
        nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.module)}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
      }
      else {
        nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.name)}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
      }
    }

    if ((nuxt.options.dev || ctx.nuxt.registerWebManifestInRouteRules) && webManifest) {
      nitroConfig.routeRules[`${ctx.base}${ctx.resolvedOptions.manifestFilename ?? 'manifest.webmanifest'}`] = {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
    }
  })

  nuxt.hook('nitro:init', async (nitro) => {
    try {
      let outDir: string
      if (nuxt.options.dev) {
        outDir = ctx.outDir
      }
      else {
        ctx.outDir = nitro.options.output.publicDir
        ctx.publicDir = ctx.outDir
        ctx.rootDir = ctx.outDir
        outDir = ctx.outDir
        ctx.resolvedOptions.outDir = ctx.outDir
      }

      // add custom bundler options
      await ctx.nuxt.initPwaConfiguration()

      // apply default options
      await prepareResolvedPwaOptions(ctx as unknown as any, nuxt, outDir)
    }
    catch (e) {
      await ctx.hooks.callHook('context:ready', e)
      throw e
    }

    await ctx.hooks.callHook('context:ready')
  })

  await ctx.nuxt.prepareNuxtOptions()

  if (!nuxt.options.dev) {
    if (semver.gte(ctx.nuxt.nuxtVersion, '3.8.0')) {
      nuxt.hook('nitro:build:public-assets', async () => {
        await buildPwaAssets(ctx as unknown as any)
      })
    }
    else {
      nuxt.hook('nitro:init', (nitro) => {
        nitro.hooks.hook('rollup:before', async () => {
          await buildPwaAssets(ctx as unknown as any)
        })
      })
      if (nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */) {
        nuxt.hook('close', async () => {
          await buildPwaAssets(ctx as unknown as any)
        })
      }
    }
  }
}
