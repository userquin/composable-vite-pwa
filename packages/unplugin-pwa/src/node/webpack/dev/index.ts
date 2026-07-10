// packages/unplugin-pwa/src/node/webpack/dev/index.ts
import type { PWAPluginContext } from '../../context-types'
import { promises as fs } from 'node:fs'
import { generateRegisterSW } from '../../generate-register-sw'
import { generateWebManifest } from '../../generate-web-manifest'

export interface WebpackDevMiddleware {
  (req: { url?: string }, res: {
    setHeader: (name: string, value: string) => void
    end: (body?: string | Uint8Array) => void
  }, next: () => void): void | Promise<void>
}

export function getDevMiddlewares(ctx: PWAPluginContext<any, any, any>): WebpackDevMiddleware[] {
  return [
    (req, res, next) => {
      if (!ctx.resolvedOptions?.manifest)
        return next()
      const url = req.url?.split('?')[0]
      const manifestUrl = `${ctx.resolvedOptions.base}${ctx.resolvedOptions.manifestFilename}`
      if (url === manifestUrl || url === `/${ctx.resolvedOptions.manifestFilename}`) {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(generateWebManifest(ctx))
        return
      }
      next()
    },
    async (req, res, next) => {
      if (ctx.resolvedOptions?.injectRegister !== 'script' && ctx.resolvedOptions?.injectRegister !== 'script-defer')
        return next()
      const url = req.url?.split('?')[0]
      if (url === `${ctx.resolvedOptions.base}registerSW.js` || url === '/registerSW.js') {
        const code = await generateRegisterSW(ctx)
        if (code) {
          res.setHeader('Content-Type', 'application/javascript')
          res.end(code)
          return
        }
      }
      next()
    },
    async (req, res, next) => {
      const url = req.url?.split('?')[0]
      const assetsMap = ctx.dev.options?.swAssetsPaths
      if (assetsMap && url && assetsMap.has(url)) {
        const filePath = assetsMap.get(url)
        if (filePath) {
          try {
            const content = await fs.readFile(filePath)
            res.setHeader('Content-Type', 'application/javascript')
            res.end(content)
            return
          }
          catch {
            // fall through
          }
        }
      }
      next()
    },
  ]
}

/**
 * Inject the HMR script into the HTML (for Webpack dev server).
 * This should be used in your HTML template or via HtmlWebpackPlugin.
 */
export function injectHmrScript(html: string, base: string): string {
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  return html.replace(
    '</body>',
    `<script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(${JSON.stringify(`${normalizedBase}sw.js`)});
}
</script>
</body>`,
  )
}
