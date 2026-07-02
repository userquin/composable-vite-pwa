import type { PWAPluginContext } from './context-types'
import { createWebManifestHtmlLink } from './create-web-manifest-html-link'
import { checkForHtmlHead } from './html'

/**
 * Adds PWA web manifest link to the HTML entry point to the HTML entry point.
 * @param html The HTML entry point.
 * @param ctx The PWA Context.
 */
export function injectWebManifestHtmlLink(
  html: string,
  ctx: PWAPluginContext<any, any, any>,
) {
  const link = createWebManifestHtmlLink(ctx)
  return checkForHtmlHead(html).replace(
    '</head>',
    `${link}</head>`,
  )
}
