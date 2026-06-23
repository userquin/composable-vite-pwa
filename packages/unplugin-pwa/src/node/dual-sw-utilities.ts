import type { PWAPluginContext } from './context-types'

export function isDualServiceWorker(
  ctx: PWAPluginContext<any, any, any, any>,
) {
  switch (ctx.strategy) {
    case 'generate-sw':
      return ctx.resolvedOptions.generateSW?.swType === 'classic-and-module'
    case 'build-sw':
      return ctx.resolvedOptions.buildSW?.swType === 'classic-and-module'
  }

  return false
}
