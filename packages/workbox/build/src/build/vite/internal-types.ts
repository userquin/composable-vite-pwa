import type { BundlerOptions } from '../bundler/bundler-types'

export interface ViteBuildOptions extends BundlerOptions {
  plugins?: import('vite').PluginOption[]
  define?: import('vite').UserConfig['define']
  /**
   * The directory from which .env files are loaded.
   *
   * Can be an absolute path, or a path relative to the project root.
   *
   * Set to `false` to disable loading .env files.
   *
   * @default 'root'
   *
   * @see https://vite.dev/config/shared-options#envdir
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envDir?: import('vite').UserConfig['envDir']
  /**
   * Env variables starting with `envPrefix` will be exposed to your client code via import.meta.env.
   *
   * @default 'VITE_'
   *
   * @see https://vite.dev/config/shared-options#envprefix
   * @see https://vite.dev/guide/env-and-mode#env-files
   */
  envPrefix?: import('vite').UserConfig['envPrefix']
  sourcemap?: import('vite').BuildOptions['sourcemap']
  generateSW: boolean
}
