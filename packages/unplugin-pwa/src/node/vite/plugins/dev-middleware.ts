import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import pc from 'picocolors'
import { prepareSwBuild } from '../../dev/prepare-sw-build'
import { generateWebManifest } from '../../generate-web-manifest'

export function DevMiddlewarePlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
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
        let map = internalDevOptions.swAssetsPaths.get(url)
        if (!map) {
          map = internalDevOptions.mapSWSourcemapFile?.(url)
          map = map
            ? internalDevOptions.swAssetsPaths.get(map)
            : undefined
        }

        if (!map) {
          return next()
        }

        res.statusCode = 200
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'public, max-age=1, must-revalidate')
        res.write(await fs.readFile(map, 'utf-8'))
        res.end()
      })

      if (ctx.strategy === 'inject-manifest' && ctx.injectManifestSWAtPublicDir()) {
        const swSrc = normalizePath(path.resolve(process.cwd(), ctx.resolvedOptions.injectManifest!.swSrc as string))
        const swSrcPath = normalizePath(path.dirname(swSrc))
        server.middlewares.use(async (req, res, next) => {
          const url = req.url
          if (!url) {
            return next()
          }

          const internalDevOptions = ctx.dev.options!
          const swAssetsPaths = internalDevOptions.swAssetsPaths
          const [normalizedId, swId] = ctx.normalizeDevServiceWorkerId?.(
            'load',
            'sw',
            url,
          ) ?? ([url.startsWith(ctx.base) ? url.slice(ctx.base.length) : url, url])
          const swNames = internalDevOptions.swNames
          if (
            normalizedId === swNames.name
          ) {
            if (!ctx.dev.options.swGenerated) {
              ctx.dev.options.swAssetKeys.add(swSrc)
              ctx.sources.add(swSrc)
              await prepareSwBuild(ctx)
            }
            const asset = swAssetsPaths.get(swId)
            if (asset) {
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/javascript')
              res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
              res.write(await fs.readFile(asset, 'utf-8'))
              res.end()
              return
            }
          }

          if (req.headers.referer && !req.headers.referer.endsWith('.html')) {
            const referer = new URL(req.headers.referer)
            const [normalizedAsset] = ctx.normalizeDevServiceWorkerId?.(
              'load',
              'sw-dep',
              referer.pathname,
            ) ?? referer.pathname
            // dependency found: the incoming request from some internal built dependency
            // sw.js => import x from './b.js' => we need to add b.js to sources
            // referer.pathname in previous case is the sw.js
            if (swAssetsPaths.has(normalizedAsset)) {
              // now check if already registered at sources
              const [normalizedAssetDep, assetDepId] = ctx.normalizeDevServiceWorkerId?.(
                'load',
                'sw-dep',
                url,
              ) ?? url
              // the path for the incoming request shouldn't be at temp folder: resolve it from swSrc path
              if (!swAssetsPaths.has(normalizedAssetDep)) {
                const depPath = path.resolve(swSrcPath, assetDepId.startsWith('/') ? assetDepId.slice(1) : assetDepId)
                try {
                  await fs.access(depPath, fs.constants.R_OK)
                  const nPath = normalizePath(depPath)
                  ctx.sources.add(nPath)
                  ctx.dev.options.swAssetKeys.add(nPath)
                }
                catch {
                  // ignore??
                }
              }
            }
          }

          return next()
        })
      }
    },
  }
}
