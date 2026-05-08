import type { GenerateSWOptions, InjectManifestOptions, SWTarget, SWType } from '../types'

export interface BuildSWOptions<T extends SWType> extends InjectManifestOptions {
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
   * If set to 'production', then an optimized service worker bundle that
   * excludes debugging info will be produced. If not explicitly configured
   * here, the `process.env.NODE_ENV` value will be used, and failing that, it
   * will fall back to `'production'`.
   * @default "production"
   */
  mode?: string | null
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
}

export type BuildGenerateSWOptions<T extends SWType> = GenerateSWOptions<T>

export type BuildInjectManifestSWOptions<T extends SWType> = BuildSWOptions<T>
