import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Compiler, WebpackPluginInstance } from 'webpack'
import type { PWAPluginContext } from '../context-types'
import type { VitePWAOptions, VitePWAStrategy } from '../types'
import { FILE_SW_REGISTER } from '../constants'
import { createWebpackPWAContext } from '../context'
import { prepareSwBuild } from '../dev/prepare-sw-build'
import { prepareSwNamesAndGlobDirectory } from '../dev/prepare-sw-names-and-glob-directory'
import { generateRegisterSW } from '../generate-register-sw'
import { generateWebManifest } from '../generate-web-manifest'
import { injectGenerateRegisterSW } from '../inject-generate-register-sw'
import { injectWebManifestHtmlLink } from '../inject-web-manifest-html-link'
import { prepareWebpackPWAContext } from './helpers'
import { applyVirtualModules } from './virtual-modules'

// todo: move this to types.ts and don't re-export here any type, types.d.mts should be at subpackages exports
export interface WebpackPWAPlugin extends WebpackPluginInstance {
  /** The shared context can be passed to getDevMiddlewares(). */
  api: PWAPluginContext<'webpack', any, any>
}

export function WebpackPWA<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<VitePWAOptions<UserStrategy, T>> = {},
): WebpackPWAPlugin {
  const ctx = createWebpackPWAContext({ strategies: 'generateSW', ...options } as Partial<VitePWAOptions<UserStrategy, T>>)

  return {
    api: ctx,
    apply(compiler: Compiler) {
      ctx.devEnvironment = compiler.options.mode === 'development' || compiler.watchMode
      ctx.isPreview = false

      // Webpack applies user plugins after its environment hooks have fired.
      const prepared = prepareWebpackPWAContext(compiler, ctx)
      applyVirtualModules(compiler, ctx, prepared)

      compiler.hooks.beforeCompile.tapPromise('unplugin-pwa:prepare', async () => {
        await prepared
        if (ctx.devEnvironment && ctx.resolvedOptions.devOptions?.enabled)
          await prepareSwNamesAndGlobDirectory(ctx as any)
      })

      compiler.hooks.thisCompilation.tap('unplugin-pwa', (compilation) => {
        compilation.hooks.processAssets.tapPromise(
          {
            name: 'unplugin-pwa',
            stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE,
          },
          async () => {
            await prepared
            const swSrc = ctx.strategy === 'build-sw'
              ? ctx.resolvedOptions.buildSW?.swSrc
              : ctx.strategy === 'inject-manifest'
                ? ctx.resolvedOptions.injectManifest?.swSrc
                : undefined
            if (swSrc)
              compilation.fileDependencies.add(swSrc)

            if (ctx.devEnvironment)
              return

            if (ctx.resolvedOptions.manifest) {
              compilation.emitAsset(
                ctx.resolvedOptions.manifestFilename!,
                new compiler.webpack.sources.RawSource(generateWebManifest(ctx)),
              )
            }

            if (!ctx.resolvedOptions.disable) {
              const register = await generateRegisterSW(ctx)
              if (register) {
                compilation.emitAsset(
                  FILE_SW_REGISTER,
                  new compiler.webpack.sources.RawSource(register),
                )
              }
            }

            for (const asset of compilation.getAssets()) {
              if (!asset.name.endsWith('.html'))
                continue

              let html = asset.source.source().toString()
              html = injectWebManifestHtmlLink(html, ctx)
              if (!ctx.resolvedOptions.disable)
                html = await injectGenerateRegisterSW(html, ctx, false, false) ?? html
              compilation.updateAsset(asset.name, new compiler.webpack.sources.RawSource(html))
            }
          },
        )
      })

      compiler.hooks.afterEmit.tapPromise('unplugin-pwa:build-sw', async () => {
        await prepared
        if (ctx.resolvedOptions.disable)
          return

        if (ctx.devEnvironment) {
          if (ctx.resolvedOptions.devOptions?.enabled) {
            ctx.dev.options.swGenerated = false
            await prepareSwBuild(ctx as any)
          }
          return
        }

        const generator = await ctx.pwaAssetsGenerator
        await generator?.generate()
        await ctx.runBuild()
      })
    },
  }
}

// todo: don't use default export
// todo: move this to subpackage exports
export { getDevMiddlewares, injectHmrScript } from './dev'
