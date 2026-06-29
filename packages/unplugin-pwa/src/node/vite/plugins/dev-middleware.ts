import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import pc from 'picocolors'
import { generateWebManifest } from '../../generate-web-manifest'

export function DevMiddlewarePlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): Plugin {
  return {
    name: 'unplugin-pwa:dev-web-manifest-middleware',
    sharedDuringBuild: true,
    apply: 'serve',
    enforce: 'post',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    configureServer(server) {
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }
      // web manifest middleware
      if (ctx.resolvedOptions.manifest) {
        const name = `${ctx.resolvedOptions.base}${ctx.resolvedOptions.manifestFilename}`
        server.middlewares.use(name, async (_, res) => {
          const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
          pwaAssetsGenerator?.injectManifestIcons()
          if (ctx.resolvedOptions.manifest && !ctx.resolvedOptions.manifest.theme_color) {
            console.warn([
              '',
              `${pc.cyan(`PWA v${ctx.version}`)}`,
              `${pc.yellow('WARNING: "theme_color" is missing from the web manifest, your application will not be able to be installed')}`,
            ].join('\n'))
          }
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/manifest+json')
          res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
          res.write(generateWebManifest(ctx), 'utf-8')
          res.end()
        })
      }
      // sourcemap middleware
      server.middlewares.use(async (req, res, next) => {
        const url = req.url
        if (!url || !url.endsWith('.js.map')) {
          return next()
        }

        const internalDevOptions = ctx.dev.options!
        const map = internalDevOptions.swAssetsPaths.get(url)
        if (!map) {
          return next()
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
        res.write(await fs.readFile(map, 'utf-8'))
        res.end()
      })
    },
  }
}
