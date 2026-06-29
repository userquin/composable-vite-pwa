import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'

export function DevAssetsMiddlewarePlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): Plugin {
  return {
    name: 'unplugin-pwa:dev-pwa-assets-middleware',
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
      server.middlewares.use(async (req, res, next) => {
        const url = req.url
        if (!url) {
          return next()
        }

        if (!/\.(?:ico|png|svg|webp)$/.test(url)) {
          return next()
        }

        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (!pwaAssetsGenerator) {
          return next()
        }

        const icon = await pwaAssetsGenerator.findIconAsset(url)
        if (!icon) {
          return next()
        }

        if (icon.age > 0) {
          const ifModifiedSince = req.headers['if-modified-since'] ?? req.headers['If-Modified-Since']
          const useIfModifiedSince = ifModifiedSince ? Array.isArray(ifModifiedSince) ? ifModifiedSince[0] : ifModifiedSince : undefined
          if (useIfModifiedSince && new Date(icon.lastModified).getTime() / 1000 >= new Date(useIfModifiedSince).getTime() / 1000) {
            res.statusCode = 304
            res.end()
            return
          }
        }

        const buffer = await icon.buffer
        res.setHeader('Age', icon.age / 1000)
        res.setHeader('Content-Type', icon.mimeType)
        res.setHeader('Content-Length', buffer.length)
        res.setHeader('Last-Modified', new Date(icon.lastModified).toUTCString())
        res.statusCode = 200
        res.end(buffer)
      })
    },
  }
}
