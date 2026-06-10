import type { SWType } from '../../types'
import type {
  Bundler,
  BundlerPluginType,
  ClassicBuild,
  CustomChunksInfo,
} from './bundler-types'
import { prepareSWChunks } from './prepare-sw-chunks'

interface RolldownPluginOptions<T extends SWType, B extends Bundler> {
  swType: T
  bundler: B
  destFolder: string
  customChunksInfo: CustomChunksInfo
  classicBuild: ClassicBuild
  define: Record<string, string>
  sourcemap?: boolean | 'inline' | 'hidden'
}

const escapedDotRE = /(?<!\\)\\./g

function escapeRegex(str: string): string {
  return str.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
}

export function RolldownPlugin<T extends SWType, B extends Bundler>(
  {
    bundler,
    destFolder,
    classicBuild,
    customChunksInfo,
    define,
    sourcemap,
  }: RolldownPluginOptions<T, B>,
): BundlerPluginType<B> {
  const plugin = {
    name: 'vite-pwa:workbox-build:sw-build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_: unknown, bundle: any) {
      await prepareSWChunks({
        bundle,
        destFolder,
        customChunksInfo,
        classicBuild,
      })
    },
  } as BundlerPluginType<B>

  if (bundler === 'rolldown') {
    const pattern = new RegExp(
      Object.keys(define)
        // replace `\.` (ignore `\\.`) with `\??\.` to match with `?.` as well
        .map(key => escapeRegex(key).replaceAll(escapedDotRE, '\\??\\.'))
        .join('|'),
    )

    plugin.renderChunk = async function (code, chunk) {
      pattern.lastIndex = 0
      if (!pattern.test(code))
        return

      const { transformSync } = await import('rolldown/utils')
      const result = transformSync(chunk.fileName, code, {
        lang: 'js',
        sourceType: 'module',
        define,
        sourcemap: !!sourcemap,
        tsconfig: false,
      })

      if (result.errors.length > 0) {
        throw new AggregateError(result.errors, 'oxc transform error')
      }

      return {
        code: result.code,
        map: result.map || null,
      }
    }
  }

  return plugin
}
