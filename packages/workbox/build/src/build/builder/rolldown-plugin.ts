import type { SWType } from '../../types'
import type {
  Bundler,
  BundlerPluginType,
  ClassicBuild,
  CustomChunksInfo,
  RolldownOptions,
} from './bundler-types'
import { prepareSWChunks } from './prepare-sw-chunks'

interface RolldownPluginOptions<T extends SWType, B extends Bundler> {
  swType: T
  bundler: B
  destFolder: string
  customChunksInfo: CustomChunksInfo
  classicBuild: ClassicBuild
  sourcemap?: RolldownOptions<B>['sourcemap']
}

export function RolldownPlugin<T extends SWType, B extends Bundler>(
  {
    bundler,
    destFolder,
    classicBuild,
    customChunksInfo,
    sourcemap,
  }: RolldownPluginOptions<T, B>,
): BundlerPluginType<B> {
  return {
    name: 'vite-pwa:workbox-build:sw-build-plugin',
    enforce: bundler === 'vite' ? 'pre' : undefined,
    apply: bundler === 'vite' ? 'build' : undefined,
    async generateBundle(_, bundle) {
      // rolldown fails to generate sourcemap for importScripts => use writeBundle instead
      if (bundler === 'rolldown' && classicBuild.swType === 'classic' && sourcemap) {
        return
      }
      await prepareSWChunks({
        bundle,
        destFolder,
        customChunksInfo,
        classicBuild,
      })
    },
    async writeBundle(_, bundle) {
      if (bundler === 'rolldown' && classicBuild.swType === 'classic' && sourcemap) {
        await prepareSWChunks({
          bundle,
          destFolder,
          customChunksInfo,
          classicBuild,
          writeFiles: true,
        })
      }
    },
  } as BundlerPluginType<B>
}
