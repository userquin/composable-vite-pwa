import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { ResolvedVitePWAOptions, VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { generateWebManifestFile } from '../../assets'
import { FILE_SW_REGISTER } from '../../constants'
import { generateRegisterSW } from '../../generate-register-sw'
import { injectManifest, injectServiceWorker } from '../../html'

export function BuildPlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): PluginOption {
  const transformIndexHtmlHandler = (html: string) => {
    html = injectManifest(html, ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>, false)

    if (ctx.resolvedOptions.disable === true)
      return html

    // if virtual register is requested, do not inject.
    if (ctx.resolvedOptions.injectRegister === 'auto') {
      ctx.resolvedOptions.injectRegister = ctx.useImportRegister ? null : 'script'
    }

    return injectServiceWorker(html, ctx, false)
  }

  return {
    name: 'unplugin-pwa:build',
    enforce: 'post',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return transformIndexHtmlHandler(html)
      },
      // @ts-expect-error deprecated since Vite 4
      enforce: 'post',
      transform(html: string) {
        return transformIndexHtmlHandler(html)
      },
    },
    async generateBundle(_, bundle) {
      if (ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
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
            source: generateWebManifestFile(ctx),
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
            source: generateWebManifestFile(ctx),
            fileName: ctx.resolvedOptions.manifestFilename!,
          }
        }
      }

      if (ctx.resolvedOptions.disable === true) {
        return
      }

      const source = await generateRegisterSW(ctx)
      if (!source) {
        return
      }

      if (typeof this !== 'undefined' && typeof this.emitFile !== 'undefined') {
        this.emitFile({
          type: 'asset',
          fileName: FILE_SW_REGISTER,
          source,
        })
      }
      else {
        // NOTE: assigning to bundle[foo] directly is discouraged by rollup
        // and is not supported by rolldown.
        // The api consumers should pass in the pluginCtx in the future
        bundle[FILE_SW_REGISTER] = {
          // @ts-expect-error: for Vite 3 support, Vite 4 has removed `isAsset` property
          isAsset: true,
          type: 'asset',
          // vite 6 deprecation: replaced with names
          name: undefined,
          // fix vite 6 build with manifest enabled
          names: [],
          source,
          fileName: FILE_SW_REGISTER,
        }
      }
    },
    closeBundle: {
      sequential: true,
      order: 'post',
      async handler(error) {
        if (error) {
          return
        }

        if (ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
          return
        }

        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          await pwaAssetsGenerator.generate()
        }

        if (!ctx.resolvedOptions.disable) {
          await ctx.runBuild()
        }
      },
    },
    async buildEnd(error) {
      if (error)
        throw error
    },
  } satisfies PluginOption
}
