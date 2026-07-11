import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ResolvedConfig } from 'vite'
import type { ReactRouterPWAApi, ReactRouterPWAContext } from '../../create-pwa-context'

const name = 'vite-pwa:react-router:api'

export function lookupReactRouterPWAContext(
  viteConfig: ResolvedConfig,
): ReactRouterPWAContext<any, any> {
  const plugin = viteConfig.plugins.find(plugin => plugin.name === name)?.api as ReactRouterPWAApi<any, any>
  return plugin?.ctx
}

export function ApiPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ReactRouterPWAContext<UserStrategy, T>,
): import('vite').Plugin {
  return {
    name,
    apply: 'build',
    enforce: 'post',
    api: {
      ctx,
    },
  }
}
