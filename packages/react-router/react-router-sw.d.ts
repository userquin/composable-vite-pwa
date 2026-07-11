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
  }

  export interface RouteManifest {
    [routeId: string]: RouteManifestEntry
  }

  export const ssr: boolean
  export const basename: string
  /**
   * Routes will be empty when:
   * - `ssrRuntimeInfo` is disabled at pwa options
   * - not using `buildSW` strategy
   * - running `Dev Server`: use `import.meta.env.DEV` when required to disable your logic
   */
  export const routes: RouteManifest
}
