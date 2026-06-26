import type {
  Bundler,
  PWAPluginContext,
  SWNames,
} from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { generateWebManifest } from '@composable-vite-pwa/unplugin-pwa/node/generate-web-manifest'
import {
  prepareSwNamesAndGlobDirectory,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/dev/prepare-sw-names-and-glob-directory'
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
  S extends Strategy,
  T extends SWType,
  PC extends PWAPluginContext<B, UserStrategy, S, T>,
  NPWAC extends NuxtPWAContext<
    B,
    UserStrategy,
    S,
    T,
    PC
  >,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
) {
  const resolver = createResolver(import.meta.url)
  const consumerOptions = ctx.pwaCtx.consumerOptions
  // resolve nuxt aliases
  if (consumerOptions?.path) {
    consumerOptions.path = await resolver.resolvePath(consumerOptions.path)
  }

  ctx.pwaCtx.base = nuxt.options.runtimeConfig.public.base as string || '/'
  ctx.pwaCtx.consumerOptions.base ??= ctx.pwaCtx.base
  ctx.pwaCtx.consumerOptions.scope ??= ctx.pwaCtx.base
  ctx.pwaCtx.externalConfigurationLoader = true

  const runtimeDir = resolver.resolve('./runtime')
  nuxt.options.build.transpile.push(runtimeDir)

  if (ctx.client.registerPlugin) {
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
  await ctx.loadPwaConfiguration()

  nuxt.hook('nitro:config', async (nitroConfig) => {
    ctx.nitroConfig = nitroConfig

    ctx.pwaCtx.resolvedOptions.base = ctx.pwaCtx.base
    ctx.pwaCtx.resolvedOptions.scope = ctx.pwaCtx.base
    ctx.pwaCtx.resolvedOptions.buildBase = ctx.pwaCtx.base
    ctx.pwaCtx.strategy = ctx.pwaCtx.resolvedOptions.strategy!
    ctx.pwaCtx.useImportRegister = false

    const isDev = nuxt.options.dev
    let swDisabled = false
    if (nuxt.options.dev) {
      ctx.pwaCtx.devEnvironment = true
      const internalDevOptions = ctx.pwaCtx.dev.options!
      internalDevOptions.tempFolder = resolve(nuxt.options.buildDir, 'pwa/.dev-dist')
      ctx.pwaCtx.outDir = internalDevOptions.tempFolder
      ctx.pwaCtx.rootDir = nuxt.options.rootDir
      ctx.pwaCtx.publicDir = nuxt.options.dir.public
      if (ctx.pwaCtx.resolvedOptions.disable) {
        swDisabled = true
      }
      else {
        const devOptions = ctx.pwaCtx.resolvedOptions.devOptions
        if (devOptions) {
          swDisabled = !(devOptions.enabled === true)
        }
        else {
          swDisabled = true
        }
      }
    }
    else {
      if (ctx.pwaCtx.resolvedOptions.disable) {
        swDisabled = true
      }
      if (!swDisabled) {
        prepareBuildSwNames(ctx.pwaCtx)
      }
    }

    const webManifest = ctx.pwaCtx.resolvedOptions.manifest
    let swNames: SWNames | undefined

    // prepare nitro public assets
    if (isDev) {
      if (!swDisabled) {
        nitroConfig.publicAssets = nitroConfig.publicAssets || []
        await prepareSwNamesAndGlobDirectory(ctx.pwaCtx as unknown as any)
        swNames = ctx.pwaCtx.dev.options!.swNames
        const outDir = path.resolve(
          nuxt.options.buildDir,
          'pwa/.dev-dist',
        )

        await fs.mkdir(outDir, { recursive: true })
        nitroConfig.publicAssets = nitroConfig.publicAssets || []
        nitroConfig.publicAssets.push({
          dir: outDir,
          fallthrough: true,
          baseURL: ctx.pwaCtx.base,
          maxAge: 0,
        })
      }
    }
    else {
      swNames = ctx.pwaCtx.swNames
    }

    nitroConfig.routeRules = nitroConfig.routeRules || {}
    console.log(swNames?.hasNames, ctx.pwaCtx.resolvedOptions.swType)
    if (swNames?.hasNames) {
      if (ctx.pwaCtx.resolvedOptions.swType === 'classic-and-module') {
        nitroConfig.routeRules[`${ctx.pwaCtx.base}${swNames.classic}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
        nitroConfig.routeRules[`${ctx.pwaCtx.base}${swNames.module}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
      }
      else {
        nitroConfig.routeRules[`${ctx.pwaCtx.base}${swNames.name}`] = {
          headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
          },
        }
      }
    }

    // if provided by the user, we don't know web manifest name
    if ((nuxt.options.dev || ctx.registerWebManifestInRouteRules) && webManifest) {
      nitroConfig.routeRules[`${ctx.pwaCtx.base}${ctx.pwaCtx.resolvedOptions.manifestFilename ?? 'manifest.webmanifest'}`] = {
        headers: {
          'Content-Type': 'application/manifest+json',
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
    }
  })

  nuxt.hook('nitro:init', async (nitro) => {
    let outDir: string
    if (nuxt.options.dev) {
      outDir = ctx.pwaCtx.outDir
    }
    else {
      ctx.pwaCtx.outDir = nitro.options.output.publicDir
      ctx.pwaCtx.publicDir = ctx.pwaCtx.outDir
      ctx.pwaCtx.rootDir = ctx.pwaCtx.outDir
      outDir = ctx.pwaCtx.outDir
      ctx.pwaCtx.resolvedOptions.outDir = ctx.pwaCtx.outDir
    }

    // add custom bundler options
    await ctx.initPwaConfiguration()

    // apply default options
    await prepareResolvedPwaOptions(ctx as unknown as any, nuxt, outDir)
  })

  await ctx.prepareNuxtOptions()

  if (!nuxt.options.dev) {
    if (semver.gte(ctx.nuxtVersion, '3.8.0')) {
      nuxt.hook('nitro:build:public-assets', async () => {
        // todo: check why calling this doesn't work
        // await buildPwaAssets(ctx.pwaCtx as unknown as any)
        // TypeError: Cannot read properties of undefined (reading 'pwaAssetsGenerator')
        //     at buildPwaAssets (D:/work/pwa-org/composable-vite-pwa-cli/examples/unplugin-pwa-nuxt-manual/modules/pwa/build-pwa-assets.ts:26:47)
        //     at Array.<anonymous> (D:/work/pwa-org/composable-vite-pwa-cli/examples/unplugin-pwa-nuxt-manual/modules/pwa/prepare-module.ts:210:50)
        //     at file:///D:/work/pwa-org/composable-vite-pwa-cli/node_modules/.pnpm/hookable@6.1.1/node_modules/hookable/dist/index.mjs:33:48
        const pwaAssetsGenerator = await ctx.pwaCtx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          await pwaAssetsGenerator.generate()
          pwaAssetsGenerator.injectManifestIcons()
        }

        if (ctx.pwaCtx.resolvedOptions.manifest) {
          const webManifest = generateWebManifest(ctx.pwaCtx)
          await fs.writeFile(
            path.resolve(ctx.pwaCtx.outDir, ctx.pwaCtx.resolvedOptions.manifestFilename || 'manifest.webmanifest'),
            webManifest,
            'utf-8',
          )
        }

        if (!ctx.pwaCtx.resolvedOptions.disable) {
          await ctx.pwaCtx.runBuild()
        }
      })
    }
    else {
      nuxt.hook('nitro:init', (nitro) => {
        nitro.hooks.hook('rollup:before', async () => {
          await buildPwaAssets(ctx.pwaCtx as unknown as any)
        })
      })
      if (nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */) {
        nuxt.hook('close', async () => {
          await buildPwaAssets(ctx.pwaCtx as unknown as any)
        })
      }
    }
  }
}
