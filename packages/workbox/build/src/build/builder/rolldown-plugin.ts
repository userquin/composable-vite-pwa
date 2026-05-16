import type { SWType } from '../../types'
import type {
  Bundler,
  BundlerPluginType,
  CircularDependenciesDetection,
  ClassicBuild,
} from './bundler-types'
import { prepareSWChunks } from './prepare-sw-chunks'

interface RolldownPluginOptions<T extends SWType, B extends Bundler> {
  swType: T
  bundler: B
  destFolder: string
  data: CircularDependenciesDetection
  classicBuild: ClassicBuild
}

export function RolldownPlugin<T extends SWType, B extends Bundler>(
  {
    bundler,
    destFolder,
    data,
    classicBuild,
  }: RolldownPluginOptions<T, B>,
): BundlerPluginType<B> {
  return {
    name: 'vite-pwa:workbox-build:build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      await prepareSWChunks({
        bundle,
        destFolder,
        data,
        classicBuild,
      })
    },
  } as BundlerPluginType<B>
}
