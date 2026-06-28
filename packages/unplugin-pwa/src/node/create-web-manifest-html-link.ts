import type { PWAPluginContext } from './context-types'
import type { ResolvedVitePWAOptions } from './types'

/**
 * Creates the PWA web manifest link to be added to the HTML entry point.
 * @param ctx The PWA Context.
 */
export function createWebManifestHtmlLink(
  ctx: PWAPluginContext<any, any, any, any>,
) {
  const options = ctx.resolvedOptions as ResolvedVitePWAOptions<any, any>
  const crossorigin = options.useCredentials ? ' crossorigin="use-credentials"' : ''
  if (ctx.devEnvironment) {
    const name = `${options.base}${options.manifestFilename || 'manifest.webmanifest'}`
    return options.manifest ? `<link rel="manifest" href="${name}"${crossorigin}>` : ''
  }
  else {
    return options.manifest ? `<link rel="manifest" href="${options.buildBase}${options.manifestFilename}"${crossorigin}>` : ''
  }
}
