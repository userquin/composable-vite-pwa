import type { PWAPluginContext } from './context-types'

export function generateWebManifestFile(
  ctx: PWAPluginContext<any, any, any, any>,
): string {
  return `${JSON.stringify(ctx.resolvedOptions.manifest, null, ctx.consumerOptions.minify ? 0 : 2)}\n`
}
