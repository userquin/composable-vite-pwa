import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type {
  BasePartial,
  GlobPartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { TanStackNitroPWAContext } from '../../create-nitro-pwa-context'
import path from 'node:path'
import process from 'node:process'

/**
 * Vite plugin to generate the service workers with Nitro v3.
 *
 * @param ctx The Vite PWA plugin context.
 */
export function NitroConfigurationPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: TanStackNitroPWAContext<UserStrategy, T>): PluginOption {
  return [{
    name: 'vite-pwa:tanstack:nitro-configuration:build',
    enforce: 'pre',
    apply: 'build',
    sharedDuringBuild: true,
    applyToEnvironment(environment) {
      return environment.name === 'client'
    },
    async configResolved(config) {
      if (!ctx.tanstack.nitro || ctx.tanstack.nitro.options.dev) {
        return
      }

      // at this point nitro has configured most of the entries from its hooks, we only need:
      // - add publicDir from vite
      // - use vite config.build.assetsDir for assetsDir: dontCacheBurst
      ctx.viteConfig = config
      console.log('configResolved:build')
      ctx.publicDir = config.publicDir || 'public'
      if (ctx.resolvedOptions.pwaAssets) {
        ctx.resolvedOptions.pwaAssets.integration = {
          baseUrl: ctx.base,
          publicDir: ctx.publicDir,
          outDir: ctx.outDir,
        }
      }
      const {
        preparePWAStrategy,
        preparePWAAssetsGenerator,
      } = await import('@composable-vite-pwa/unplugin-pwa/node/vite/helpers').then(({
        preparePWAStrategy,
        preparePWAAssetsGenerator,
      }) => ({
        preparePWAStrategy,
        preparePWAAssetsGenerator,
      }))

      await preparePWAStrategy(
        ctx,
        process.cwd(),
        ctx.outDir,
        config.build.assetsDir ?? 'assets',
      )

      preparePWAAssetsGenerator(ctx)

      await ctx.hooks.callHook('context:ready')
    },
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore when nitro v3 is not installed
    nitro: prepareNitroModule(ctx, false),
  }, {
    name: 'vite-pwa:tanstack:nitro-configuration:dev',
    enforce: 'pre',
    apply: 'serve',
    applyToEnvironment(environment) {
      return environment.name === 'client'
    },
    configResolved(config) {
      // no way, apply serve doesn't prevent nitro prerender instance call this plugin
      if (!ctx.tanstack.nitro || !ctx.tanstack.nitro.options.dev) {
        return
      }
      console.log('configResolved:dev')
      // won't be used
      ctx.viteConfig = config
    },
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore when nitro v3 is not installed
    nitro: prepareNitroModule(ctx, true),
  }]
}

function prepareNitroModule<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: TanStackNitroPWAContext<UserStrategy, T>,
  dev: boolean,
): import('nitro/types').NitroModule {
  return {
    setup(nitro) {
      if (dev) {
        // protect adding 2 nitro hooks
        if (!nitro.options.dev || ctx.tanstack.nitro) {
          return
        }
        // await the rest of modules to invoke the build:before hook before configuring nitro aliases
        nitro.hooks.hook('rollup:before', () => {
          console.log('rollup:before')
          ctx.tanstack.buildSWAlias = nitro.options.alias
        })
        ctx.tanstack.nitro = nitro
        return
      }

      // small nitro secondary build for prerender process, will create a new nitro
      // instance between prerender:config and prerender:init hooks
      if (nitro.options.dev || ctx.tanstack.nitro) {
        return
      }
      ctx.externalConfigurationLoader = true
      ctx.tanstack.nitro = nitro
      nitro.hooks.hook('build:before', async () => {
        console.log('build:before')
        const [
          loadExternalConfiguration,
          createManifestTransform,
          normalizeManifest,
          {
            normalizePath,
            resolveSWNames,
          },
        ] = await Promise.all([
          import('./load-external-configuration').then(({ loadExternalConfiguration }) => loadExternalConfiguration),
          import('../../create-manifest-transform').then(({ createManifestTransform }) => createManifestTransform),
          import('@composable-vite-pwa/unplugin-pwa/node/vite/helpers').then(({
            normalizeManifest,
          }) => (normalizeManifest)),
          import('@composable-vite-pwa/workbox-build/utils/resolve-sw-names').then(({
            normalizePath,
            resolveSWNames,
          }) => ({
            normalizePath,
            resolveSWNames,
          })),
        ])

        await loadExternalConfiguration(
          ctx,
        )

        ctx.outDir = nitro.options.output.publicDir
        if (ctx.outDir.endsWith('/')) {
          ctx.outDir = ctx.outDir.slice(0, ctx.outDir.length - 1)
        }

        // init out dir paths
        ctx.consumerOptions.outDir = ctx.outDir
        ctx.resolvedOptions.outDir = ctx.outDir
        ctx.rootDir = process.cwd()

        // init some more paths
        const {
          base = nitro.options.baseURL || '/',
          scope,
          buildBase,
        } = ctx.resolvedOptions
        ctx.resolvedOptions.scope = scope || base
        ctx.resolvedOptions.base = buildBase ?? base
        ctx.resolvedOptions.buildBase = ctx.resolvedOptions.base
        ctx.strategy = ctx.resolvedOptions.strategy!
        ctx.useImportRegister = false
        ctx.base = ctx.resolvedOptions.base

        if (!ctx.resolvedOptions.disable) {
          // init nitro build options
          let swSrc: string | undefined
          let options: Partial<BasePartial & GlobPartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined

          switch (ctx.strategy) {
            case 'generate-sw':
              ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
              options = ctx.resolvedOptions.generateSW
              swSrc = 'x'
              break
            case 'inject-manifest':
              ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
              options = ctx.resolvedOptions.injectManifest
              swSrc = ctx.resolvedOptions.injectManifest!.swSrc
              break
            case 'build-sw':
              ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
              options = ctx.resolvedOptions.buildSW
              swSrc = ctx.resolvedOptions.buildSW!.swSrc
              break
          }

          const { filename = 'sw.js' } = ctx.consumerOptions
          nitro.options.routeRules = nitro.options.routeRules || {}
          nitro.options.routes = nitro.options.routes || {}
          if (options) {
            options.globDirectory = normalizePath(path.relative(process.cwd(), ctx.outDir))
            options.manifestTransforms ??= []
            options.manifestTransforms.push(createManifestTransform(ctx.base || '/'))
          }

          if (swSrc) {
            const {
              swDest,
              classicSWDest,
              moduleSWDest,
            } = resolveSWNames(
              path.resolve(ctx.outDir, filename),
              swSrc as string,
              ctx.strategy === 'generate-sw',
            )

            ctx.swNames = {
              hasNames: true,
              name: swDest,
              classic: classicSWDest,
              module: moduleSWDest,
            }

            // resolveSWNames requires relative path but the combination of root and nitro.options.output.publicDir
            // will force resolveSWNames to return the SW path names with ./output/public/ prefix
            // at routeRules we just use the file names since it is the nitro manifest to prevent caching
            if (ctx.resolvedOptions.swType === 'classic-and-module') {
              nitro.options.routeRules[`${path.basename(ctx.swNames.classic)}`] = {
                headers: {
                  'Cache-Control': 'public, max-age=0, must-revalidate',
                },
              }
              nitro.options.routeRules[`${path.basename(ctx.swNames.module)}`] = {
                headers: {
                  'Cache-Control': 'public, max-age=0, must-revalidate',
                },
              }
            }
            else {
              nitro.options.routeRules[`${path.basename(ctx.swNames.name)}`] = {
                headers: {
                  'Cache-Control': 'public, max-age=0, must-revalidate',
                },
              }
            }
          }
        }

        const webManifest = ctx.resolvedOptions.manifest
        if (webManifest) {
          nitro.options.routeRules[`${ctx.resolvedOptions.manifestFilename ?? 'manifest.webmanifest'}`] = {
            headers: {
              'Content-Type': 'application/manifest+json',
              'Cache-Control': 'public, max-age=0, must-revalidate',
            },
          }
        }

        // init pwa build options
        normalizeManifest(ctx)
      })

      // await the rest of modules to invoke the build:before hook before configuring nitro aliases
      nitro.hooks.hook('rollup:before', () => {
        ctx.tanstack.buildSWAlias = nitro.options.alias
        if (ctx.strategy === 'build-sw') {
          ctx.resolvedOptions.buildSW!.alias = nitro.options.alias
        }
      })

      nitro.hooks.hook('vite:before:compile', async () => {
        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          await pwaAssetsGenerator.generate()
        }

        if (!ctx.resolvedOptions.disable) {
          await ctx.runBuild()
        }
      })
    },
  }
}
