import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type {
  ViteBundler,
  VitePWAPluginContext,
} from '../vite-context'
import { fileURLToPath } from 'node:url'
import packageJson from '../../../../package.json'
import {
  INSPECTOR_BASE_PATH_API,
  INSPECTOR_BASE_PATH_URL,
} from '../../constants'
import { inspectorWithInjectManifestWarning } from '../../logs'

export function InspectorPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  return {
    name: 'unplugin-pwa:inspector',
    apply: 'serve',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    async configureServer(server) {
      if (!ctx.envApi && ctx.viteConfig.build.ssr) {
        return
      }

      if (!ctx.resolvedOptions.devOptions?.inspector) {
        return
      }

      // since the SW is "static" there is no way to bypass the navigation fallback,
      // and so we need to disable it
      if (ctx.strategy === 'inject-manifest') {
        console.warn(inspectorWithInjectManifestWarning)
      }

      const clientDist = fileURLToPath(new URL('../../../inspector', import.meta.url))

      if (ctx.resolvedOptions.devOptions?.inspector === 'standalone' || ctx.bundler === 'vite-legacy') {
        /* if ('printUrls' in server) {
          const printUrls = server.printUrls
          server.printUrls = () => {
            const host = `${ctx.viteConfig.server.https ? 'http' : 'http'}://${ctx.viteConfig.server.https}`
          }
        } */
        const sirv = await import('sirv').then(m => (m.default ?? m))
        server.middlewares.use(
          INSPECTOR_BASE_PATH_URL,
          sirv(clientDist, {
            single: true,
            dev: true,
          }),
        )
      }

      // expose always api endpoints
      server.middlewares.use(INSPECTOR_BASE_PATH_API, async (req, res, next) => {
        if (!req.url) {
          return next()
        }
        const resolvedOptions = ctx.resolvedOptions
        const devOptions = resolvedOptions.devOptions

        if (req.url === '/') {
          res.setHeader('Content-Type', 'application/json')
          res.write(JSON.stringify({
            version: packageJson.version,
            base: ctx.base,
            swEnabled: ctx.resolvedOptions.disable === false,
            strategy: ctx.strategy,
            swType: resolvedOptions.swType,
            swDevEnabled: devOptions?.enabled === true,
            currentSWType: ctx.dev.options.swType,
            swNames: ctx.dev.options.swNames,
            manifest: resolvedOptions.manifest,
          }))
          res.end()
          return
        }

        if (req.url.startsWith('/mode')) {
          res.setHeader('Content-Type', 'application/json')
          res.write(JSON.stringify(
            devOptions?.inspector === 'vite-devtools'
              ? 'vite-devtools'
              : 'standalone',
            undefined,
            2,
          ))
          res.end()
          return
        }

        if (req.url.startsWith('/sw')) {
          const devOptions = ctx.resolvedOptions.devOptions
          const dependencies = devOptions?.enabled === true && ctx.dev.options?.swAssetKeys
            ? [...ctx.dev.options.swAssetKeys].filter(d => !d.endsWith('.map'))
            : undefined
          res.setHeader('Content-Type', 'application/json')
          res.write(JSON.stringify({
            swType: devOptions?.enabled === true ? ctx.dev.options?.swType : undefined,
            dependencies,
          }))
          res.end()
          return
        }

        next()
      })
    },
  }
}
