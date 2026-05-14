import type { GenerateSWOptions, InjectManifestOptions, SWTarget, SWType } from '../types'

export interface EnvironmentData {
  /**
   * If set to 'production', then an optimized service worker bundle that
   * excludes debugging info will be produced. If not explicitly configured
   * here, the `process.env.NODE_ENV` value will be used, and failing that, it
   * will fall back to `'production'`.
   * @default "production"
   */
  mode?: string | null
  baseUrl?: string
  define?: Record<string, any>
  /**
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envDir?: string | false
  /**
   * @default VITE_
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envPrefix?: string | string[]
}

/**
 * Defines a custom code chunk group.
 * Receives the module ID (file path) and returns the desired chunk name
 * or undefined if the module should stay in the default bundle.
 *
 * @see https://rolldown.rs/reference/TypeAlias.CodeSplittingNameFunction#type-alias-codesplittingnamefunction
 */
export type CustomChunkCallback<B extends 'vite' | 'rolldown'>
  = B extends 'vite'
    ? import('vite').Rolldown.CodeSplittingNameFunction
    : import('rolldown').CodeSplittingNameFunction

export interface BuildSWOptions<T extends SWType, B extends 'vite' | 'rolldown' = 'vite'> extends InjectManifestOptions, EnvironmentData {
  /**
   * The type of the service worker.
   *
   * @default classic
   */
  swType?: T
  /**
   * Whether the runtime code for the Workbox library should be included in the
   * top-level service worker, or split into a separate file that needs to be
   * deployed alongside the service worker. Keeping the runtime separate means
   * that users will not have to re-download the Workbox code each time your
   * top-level service worker changes.
   * @default false
   */
  inlineWorkboxRuntime?: boolean
  /**
   * When using `classic` or `module` and splitting workbox runtime (inlineWorkboxRuntime set to false), this flag controls the
   * name of the `workbox-**.js` chunk:
   * - when true, workbox will generate the same old asset name `workbox-<hash>.js` using `hex`
   * - when false, workbox will generate `workbox-classic-<hash>.js` or `workbox-modern-<hash>.js` with modern Vite/Rolldown hash.
   *
   * When using `classic-and-module` (dual build), the build will use modern Vite/Rolldown hash regardless of the value of this flag.
   *
   * @default true
   */
  workboxRuntimeCompatible?: boolean
  /**
   * Service worker target build.
   * @default undefined
   * @see https://vite.dev/config/build-options#build-target
   */
  target?: SWTarget
  /**
   * Should minify the output?
   * - when specified it is preserved
   * - true when sourcemap is not set to false or mode is set to production
   * - otherwise false
   */
  minify?: boolean
  /**
   * Custom chunks support (**requires magicast**).
   *
   * This allows splitting specific modules into separate files via a callback.
   *
   * When used in 'classic' mode, static imports will be automatically added to `importScripts`.
   *
   * @example
   * ```ts
   * customChunks: (moduleId) => {
   *   if (moduleId.includes('node_modules/dexie')) {
   *     return 'dexie-lib';
   *   }
   * }
   * ```
   *
   * @see https://rolldown.rs/reference/TypeAlias.CodeSplittingNameFunction#type-alias-codesplittingnamefunction
   */
  customChunks?: CustomChunkCallback<B>
}

export type BuildGenerateSWOptions<T extends SWType> = GenerateSWOptions<T> & EnvironmentData
