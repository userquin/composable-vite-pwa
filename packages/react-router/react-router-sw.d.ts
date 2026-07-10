declare module 'virtual:vite-pwa/react-router/sw' {
  // the types extracted from `@react-router/dev/dist/routes-<hash>.d.ts`
  export interface RouteManifestEntry {
    /**
     * The path this route uses to match on the URL pathname.
     */
    path?: string
    /**
     * Should be `true` if it is an index route. This disallows child routes.
     */
    index?: boolean
    /**
     * Should be `true` if the `path` is case-sensitive. Defaults to `false`.
     */
    caseSensitive?: boolean
    /**
     * The unique id for this route, named like its `file` but without the
     * extension. So `app/routes/gists/$username.tsx` will have an `id` of
     * `routes/gists/$username`.
     */
    id: string
    /**
     * The unique `id` for this route's parent route, if there is one.
     */
    parentId?: string
    /**
     * The path to the entry point for this route, relative to
     * `config.appDirectory`.
     */
    file: string
  }

  export interface RouteManifest {
    [routeId: string]: RouteManifestEntry
  }

  export const version: string
  export const ssr: boolean
  export const enablePrecaching: boolean
  export const navigateFallback: string | undefined
  export const clientsClaimMode: 'auto' | boolean
  export const cleanupOutdatedCaches: boolean
  export const promptForUpdate: boolean
  export const staticRoutes: RouteManifest
  export const dynamicRoutes: RouteManifest
  export const routes: RouteManifest
}
