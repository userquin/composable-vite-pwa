import type { PWAPluginContext } from './context-types'
import { createGenerateRegisterSW } from './create-generate-register-sw-script'
import { checkForHtmlHead } from './html'

/**
 * Adds the `registerSW.js` script to the HTML entry point.
 * @param html The HTML entry point.
 * @param ctx The PWA Context.
 * @param dev For dev server
 * @param injectAtDev Inject the script at dev server?
 */
export async function injectGenerateRegisterSW(
  html: string,
  ctx: PWAPluginContext<any, any, any>,
  dev: boolean,
  injectAtDev = true,
): Promise<string | undefined> {
  const script = await createGenerateRegisterSW(ctx, dev, injectAtDev)
  return script
    ? checkForHtmlHead(html).replace(
        '</head>',
        `${script}</head>`,
      )
    : html
}
