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
}

export function RolldownPlugin<T extends SWType, B extends Bundler>(
  {
    bundler,
    destFolder,
    classicBuild,
    customChunksInfo,
  }: RolldownPluginOptions<T, B>,
): BundlerPluginType<B> {
  return {
    name: 'vite-pwa:workbox-build:sw-build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      await prepareSWChunks({
        bundle,
        destFolder,
        customChunksInfo,
        classicBuild,
      })
    },
  } as BundlerPluginType<B>
}
