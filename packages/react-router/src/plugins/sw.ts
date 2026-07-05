import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { ReactRouterPWAContext } from '../create-pwa-context'

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
    enforce: 'post',
    resolveId(id, _, options) {
      return !options.ssr && id === VIRTUAL_REACT_ROUTER_SW
        ? RESOLVED_VIRTUAL_REACT_ROUTER_SW
        : undefined
    },
    load(id) {
      if (id === RESOLVED_VIRTUAL_REACT_ROUTER_SW) {
        const {
          version,
          enablePrecaching,
          navigateFallback,
          clientsClaimMode,
          cleanupOutdatedCaches,
          promptForUpdate,
        } = ctx.reactRouter.sw

        // todo: check if react router has some utility helper for this
        const routes = ctx.reactRouter.lookupContext().reactRouterConfig.routes ?? []
        const allRoutes = Object.values(routes).filter((r) => {
          return r.index !== true && r.id !== 'root'
        })
        const staticRoutes = allRoutes.filter(r => r.path && !r.path.includes(':'))
        const dynamicRoutes = allRoutes.filter(r => r.path && r.path.includes(':'))

        // todo: convert routes to a more usable format
        // todo: maybe we need to change also the react-router-sw.d.ts at root
        // todo: use define instead and use import.meta.env + vite-env.d.ts with importMeta augmentation at src/sw/index.ts
        return `export const version = '${version}'
export const ssr = ${ctx.reactRouter.lookupContext().reactRouterConfig.ssr}
export const enablePrecaching = ${enablePrecaching}
export const navigateFallback = ${JSON.stringify(navigateFallback)}
export const clientsClaimMode = ${JSON.stringify(clientsClaimMode)}
export const cleanupOutdatedCaches = ${cleanupOutdatedCaches}
export const promptForUpdate = ${promptForUpdate}
export const staticRoutes = ${JSON.stringify(staticRoutes)}
export const dynamicRoutes = ${JSON.stringify(dynamicRoutes)}
export const routes = ${JSON.stringify(allRoutes)}
`
      }
    },
  }
}
