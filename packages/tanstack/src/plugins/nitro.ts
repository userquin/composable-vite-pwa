import type { ResolvedBuildSW, VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { TanStackPWAContext } from '../create-pwa-context'
import { resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'

/**
 * Vite plugin to generate the service workers with Nitro v3.
 *
 * @param ctx The Vite PWA plugin context.
 */
export function NitroPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: TanStackPWAContext<UserStrategy, T>): Plugin {
  return {
    name: 'vite-pwa:tanstack:nitro',
    apply: 'build',
    sharedDuringBuild: true,
    applyToEnvironment(environment) {
      // todo check if nitro:main present to switch to custom config
      // return environment.name === 'client' && environment.config.plugins?.find(p => p.name === 'nitro:main')
      return environment.name === 'client'
    },
    // eslint-disable-next-line ts/ban-ts-comment
    // @ts-ignore ignore when nitro v3 is not installed
    nitro: prepareNitroModule(ctx),
  }
}

function prepareNitroModule<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: TanStackPWAContext<UserStrategy, T>): import('nitro/types').NitroModule {
  return {
    setup(nitro) {
      // todo: we'll need to use external configuration at build:before
      // todo: loading all the configuration inside the hook like at nuxt nitro hooks
      // nitro v3 doesn't filter existing, will add this twice
      if (ctx.tanstack.nitro) {
        return
      }
      ctx.tanstack.nitro = nitro
      ctx.tanstack.clientOutputBuild = nitro.options.output.publicDir
      nitro.hooks.hook('build:before', () => {
        ctx.outDir = ctx.tanstack.clientOutputBuild
        if (ctx.outDir.endsWith('/')) {
          ctx.outDir = ctx.outDir.slice(0, ctx.outDir.length - 1)
        }
        ctx.consumerOptions.outDir = ctx.outDir
        let swSrc: string | undefined
        switch (ctx.strategy) {
          case 'generate-sw':
            swSrc = 'x'
            break
          case 'inject-manifest':
            ctx.consumerOptions.injectManifest ??= {}
            swSrc = ctx.consumerOptions.injectManifest!.swSrc
            break
          case 'build-sw':
            ctx.consumerOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
            swSrc = ctx.consumerOptions.buildSW!.swSrc
            break
        }

        if (swSrc) {
          const base = ctx.consumerOptions.base || '/'
          const {
            filename = 'sw.js',
          } = ctx.consumerOptions
          const {
            swDest,
            classicSWDest,
            moduleSWDest,
          } = resolveSWNames(
            ctx.strategy === 'generate-sw' ? '' : filename,
            swSrc as string,
            ctx.strategy === 'generate-sw',
          )
          ctx.swNames = {
            hasNames: true,
            name: swDest,
            classic: classicSWDest,
            module: moduleSWDest,
          }
          nitro.options.routeRules = nitro.options.routeRules || {}
          if (ctx.consumerOptions.swType === 'classic-and-module') {
            nitro.options.routeRules.routeRules[`${base}${ctx.swNames.classic}`] = {
              headers: {
                'Cache-Control': 'public, max-age=0, must-revalidate',
              },
            }
            nitro.options.routeRules.routeRules[`${base}${ctx.swNames.module}`] = {
              headers: {
                'Cache-Control': 'public, max-age=0, must-revalidate',
              },
            }
          }
          else {
            nitro.options.routeRules.routeRules[`${base}${ctx.swNames.name}`] = {
              headers: {
                'Cache-Control': 'public, max-age=0, must-revalidate',
              },
            }
          }

          const webManifest = ctx.consumerOptions.manifest
          if (webManifest) {
            nitro.options.routeRules.routeRules[`${base}${ctx.consumerOptions.manifestFilename ?? 'manifest.webmanifest'}`] = {
              headers: {
                'Content-Type': 'application/manifest+json',
                'Cache-Control': 'public, max-age=0, must-revalidate',
              },
            }
          }
        }
      })

      nitro.hooks.hook('compiled', async () => {
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
