import type { Strategy, WorkboxBuildConfiguration } from '../../config/types'
import type { SWType } from '../../types'
import { internalWebpackBuild } from '../builder/internal-webpack-build'

export class WorkboxPlugin<
  S extends Strategy,
  T extends SWType = 'classic',
> {
  static pluginName = 'VitePWAWorkboxBuildRspackPlugin'

  #options: WorkboxBuildConfiguration<S, T>

  constructor(
    strategy: S,
    options: Partial<WorkboxBuildConfiguration<S, T>> = {},
  ) {
    this.#options = Object.assign(options, { strategy }) as WorkboxBuildConfiguration<S, T>
  }

  /**
   * Rspack plugin interface.
   * Hooks into 'afterEmit' to guarantee that Rspack has finished writing
   * the host application files to disk before we run our Rolldown compiler.
   */
  apply(compiler: import('@rspack/core').Compiler) {
    const pluginName = WorkboxPlugin.pluginName

    // Rspack implements the exact same tapPromise 'afterEmit' hook as Webpack in Rust
    compiler.hooks.afterEmit.tapPromise(
      pluginName,
      async (compilation: import('@rspack/core').Compilation) => {
        try {
          await this.#executeStrategy(compiler)
        }
        catch (error: any) {
          // Pipes any async errors back to the Rspack CLI console UI
          compilation.errors.push(error)
        }
      },
    )
  }

  /**
   * Triggers your internal, custom Rolldown compilation workflows.
   */
  async #executeStrategy(compiler: import('@rspack/core').Compiler) {
    await internalWebpackBuild(
      WorkboxPlugin.pluginName,
      // We extract Rspack's configured output directory to use as our globDirectory
      compiler.options.output.path,
      this.#options,
    )
  }
}
