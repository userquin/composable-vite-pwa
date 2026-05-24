import type {
  Strategy,
  WorkboxBuildConfiguration,
} from '../../config/types'
import type { SWType } from '../../types'
import { internalWebpackBuild } from '../builder/internal-webpack-build'

export class WorkboxPlugin<
  S extends Strategy,
  T extends SWType = 'classic',
> {
  static pluginName = 'VitePWAWorkboxBuildWebpackPlugin'

  #options: WorkboxBuildConfiguration<S, T>

  /**
   * @param {Strategy} strategy
   * @param {WorkboxBuildConfiguration} options
   */
  constructor(
    strategy: S,
    options: Partial<WorkboxBuildConfiguration<S, T>> = {},
  ) {
    this.#options = Object.assign(options, { strategy }) as WorkboxBuildConfiguration<S, T>
  }

  /**
   * Webpack plugin interface — compatible with Webpack 4 and 5.
   * In Webpack 4 the compiler is un-typed, whereas Webpack 5 provides full type definitions.
   */
  apply(compiler: import('webpack').Compiler) {
    const pluginName = WorkboxPlugin.pluginName

    compiler.hooks.afterEmit.tapPromise(
      pluginName,
      async (compilation: import('webpack').Compilation) => {
        try {
          await this.#executeStrategy(compiler)
        }
        catch (error: any) {
          // Pipes errors cleanly back to the host compiler UI
          compilation.errors.push(error)
        }
      },
    )
  }

  /**
   * Orchestrates the active workflow targeting the Rolldown variants.
   */
  async #executeStrategy(
    compiler: import('webpack').Compiler,
  ) {
    await internalWebpackBuild(
      WorkboxPlugin.pluginName,
      {
        cwd: compiler.context,
        // We extract Webpack's configured output directory to use as our globDirectory
        outputPath: compiler.options.output.path,
      },
      this.#options,
    )
  }
}
