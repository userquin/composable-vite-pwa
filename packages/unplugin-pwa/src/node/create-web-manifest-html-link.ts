import type { PWAPluginContext } from './context-types'

/**
 * Creates the PWA web manifest link to be added to the HTML entry point.
 * @param ctx The PWA Context.
 */
export function createWebManifestHtmlLink(
  ctx: PWAPluginContext<any, any, any, any>,
) {
  const options = ctx.resolvedOptions
  const crossorigin = options.useCredentials ? ' crossorigin="use-credentials"' : ''
  if (ctx.devEnvironment) {
    const name = `${options.base}${options.manifestFilename}`
    return options.manifest ? `<link rel="manifest" href="${name}"${crossorigin}>` : ''
  }
  else {
    return options.manifest ? `<link rel="manifest" href="${options.buildBase}${options.manifestFilename}"${crossorigin}>` : ''
  }
}
