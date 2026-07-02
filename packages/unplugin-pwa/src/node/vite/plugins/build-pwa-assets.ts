import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { generateWebManifest } from '../../generate-web-manifest'

/**
 * Vite plugin to generate the manifest.webmanifest.
 *
 * Injects also pwa icons when using pwa assets generator
 *
 * @param ctx The Vite PWA plugin context.
 */
export function BuildPwaAssetsPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  return {
    name: 'unplugin-pwa:build:pwa-assets',
    enforce: 'post',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    async generateBundle(_, bundle) {
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }

      if (ctx.resolvedOptions.manifest) {
        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          pwaAssetsGenerator.injectManifestIcons()
        }

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
