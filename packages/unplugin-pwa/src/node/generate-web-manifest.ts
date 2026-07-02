import type { PWAPluginContext } from './context-types'

export function generateWebManifest(
  ctx: PWAPluginContext<any, any, any>,
): string {
  return `${JSON.stringify(ctx.resolvedOptions.manifest, null, ctx.resolvedOptions.minify ? 0 : 2)}\n`
}
