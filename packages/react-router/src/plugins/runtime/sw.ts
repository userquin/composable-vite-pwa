import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ReactRouterPWAContext } from '../../create-pwa-context'

const VIRTUAL_REACT_ROUTER_SW = 'virtual:vite-pwa/react-router/sw'
const RESOLVED_VIRTUAL_REACT_ROUTER_SW = `\0${VIRTUAL_REACT_ROUTER_SW}`

/**
 * The react router service worker build plugin.
 *
 * **NOTE**: this plugin must not be added at vite plugins, only at SW build time plugins.
 *
 * @param ctx The react router PWA plugin context.
 */
export function SWPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: ReactRouterPWAContext<UserStrategy, T>,
): import('vite').Plugin {
  return {
    name: 'vite-pwa:react-router:sw:plugin',
    resolveId(id) {
      return id === VIRTUAL_REACT_ROUTER_SW
        ? RESOLVED_VIRTUAL_REACT_ROUTER_SW
        : undefined
    },
    async load(id) {
      if (id === RESOLVED_VIRTUAL_REACT_ROUTER_SW) {
        let ssr = false
        let basename = ctx.resolvedOptions.base || '/'
        try {
          const reactRouterConfig = ctx.reactRouter.reactRouterConfig()
          ssr = reactRouterConfig.ssr
          basename = reactRouterConfig.basename || basename
          if (ctx.resolvedOptions.strategy === 'build-sw' && ctx.reactRouter.ssrRuntimeInfo && !ctx.devEnvironment) {
            const routes = Object.values(reactRouterConfig.routes ?? {})
              .filter(r => r.id !== 'root')
              .map(r => ({
                id: r.id,
                path: r.path,
                index: r.index,
                parentId: r.parentId,
              }))

            return `export const ssr = ${ssr}
export const basename = ${JSON.stringify(basename)}
export const routes = ${JSON.stringify(routes)}
`
          }
        }
        catch (e) {
          // dev server shouldn't have rr config resolved
          if (!ctx.devEnvironment) {
            throw e
          }
        }

        return `export const ssr = ${JSON.stringify(ssr)}
export const basename = ${JSON.stringify(basename)} 
export const routes = []
`
      }
    },
  }
}
