import type { RouteManifest } from 'virtual:vite-pwa/react-router/sw'
import { CacheableResponsePlugin } from '@composable-vite-pwa/workbox-swkit/cacheable-response'
import { registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'
import { NetworkOnly, StaleWhileRevalidate } from '@composable-vite-pwa/workbox-swkit/strategies'
import { dynamicRoutes, staticRoutes } from 'virtual:vite-pwa/react-router/sw'

export async function resolveRoutePath(r: RouteManifest) {
  const routes: string[] = []

  for (const route of Object.values(r)) {
    if (route.path)
      routes.push(route.path)
  }

  return routes
}

export async function setupRoutes() {
  // disable precaching in dev
  if (!import.meta.env.PROD)
    return

  const baseUrl = import.meta.env.BASE_URL
  const useStaticRoutes = await resolveRoutePath(staticRoutes)

  const useDynamicRoutes = await resolveRoutePath(dynamicRoutes)

  if (useStaticRoutes.length) {
    const staticRoutesRegexp = new RegExp(`^${baseUrl}(${useStaticRoutes.join('|')})$`)
    registerRoute(
      ({ request, sameOrigin, url }) => request.destination === 'document' && sameOrigin && staticRoutesRegexp.test(url.pathname),
      new StaleWhileRevalidate({
        cacheName: 'static-pages',
        matchOptions: {
          ignoreVary: true,
          ignoreSearch: true,
          ignoreMethod: true,
        },
        plugins: [
          new CacheableResponsePlugin({
            statuses: [200],
          }),
        ],
      }),
      'GET',
    )
  }
  if (useDynamicRoutes.length) {
    const dynamicRoutesRegexp = new RegExp(`^${baseUrl}(${useDynamicRoutes.map((r) => {
      const parts = r.split('/')
      parts.forEach((part, i) => {
        if (part.startsWith(':'))
          parts[i] = '([^/]+)'
      })
      return `(${parts.join('/')})`
    }).join('|')})$`)
    registerRoute(
      ({ request, sameOrigin, url }) => request.destination === 'document' && sameOrigin && dynamicRoutesRegexp.test(url.pathname),
      new NetworkOnly({
        plugins: [{
          handlerDidError: async ({ state, error }) => {
            console.log(state, error)
            return Response.redirect('/', 302)
          },
        }],
      }),
    )
  }
}
