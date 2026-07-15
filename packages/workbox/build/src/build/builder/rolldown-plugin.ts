import type { SWType } from '../../types'
import type {
  Bundler,
  BundlerPluginType,
  ClassicBuild,
  CustomChunksInfo,
  RolldownOptions,
} from './bundler-types'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
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
  sources: string[],
  {
    bundler,
    destFolder,
    classicBuild,
    customChunksInfo,
    sourcemap,
  }: RolldownPluginOptions<T, B>,
  swSrc: string,
): BundlerPluginType<B> {
  let resolvedId: string | undefined
  return {
    name: 'vite-pwa:workbox-build:sw-build-plugin',
    // enforce: bundler === 'vite' ? 'pre' : undefined,
    // apply: bundler === 'vite' ? 'build' : undefined,
    async buildStart() {
      if (classicBuild.generateSW) {
        return
      }
      // if (!swSrc) {
      //   return
      // }
      let resolved = await this.resolve(swSrc)
      if (!swSrc.startsWith('./')) {
        resolved ||= await this.resolve(`./${swSrc}`)
      }
      resolvedId = resolved?.id || swSrc
    },
    async buildEnd(error) {
      if (!resolvedId || error) {
        return
      }
      for (const id of this.getModuleIds()) {
        if (id.startsWith('\0')) {
          continue
        }
        sources.push(normalizePath(id))
      }
    },
    resolveId(id: string) {
      if (!classicBuild.generateSW) {
        return undefined
      }

      // const name = classicBuild.swNamesPrefix && id.startsWith(classicBuild.swNamesPrefix) ? id.slice(classicBuild.swNamesPrefix.length) : id

      return swSrc === id ? id : undefined
    },
    load(id: string) {
      return classicBuild.generateSW && swSrc === id ? classicBuild.generateSWCode : undefined
    },
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
