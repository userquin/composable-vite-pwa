import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { FILE_SW_REGISTER } from '../../constants'
import { generateRegisterSW } from '../../generate-register-sw'
import { injectGenerateRegisterSW } from '../../inject-generate-register-sw'
import { injectWebManifestHtmlLink } from '../../inject-web-manifest-html-link'

export function BuildRegisterSWPlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): Plugin {
  const transformIndexHtmlHandler = async (html: string) => {
    if (!ctx.envApi && ctx.viteConfig.build.ssr) {
      return html
    }
    html = injectWebManifestHtmlLink(html, ctx)

    if (ctx.resolvedOptions.disable === true)
      return html

    // if virtual register is requested, do not inject.
    if (ctx.resolvedOptions.injectRegister === 'auto') {
      ctx.resolvedOptions.injectRegister = ctx.useImportRegister ? null : 'script'
    }

    return await injectGenerateRegisterSW(html, ctx, false, false)
  }

  return {
    name: 'unplugin-pwa:build:register-sw',
    enforce: 'post',
    apply: 'build',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    transformIndexHtml: {
      order: 'post',
      async handler(html) {
        return await transformIndexHtmlHandler(html)
      },
      // @ts-expect-error deprecated since Vite 4
      enforce: 'post',
      async transform(html: string) {
        return await transformIndexHtmlHandler(html)
      },
    },
    async generateBundle(_, bundle) {
      if ((!ctx.envApi && ctx.viteConfig.build.ssr) || ctx.resolvedOptions.disable === true) {
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
  }
}
