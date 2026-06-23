import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { GlobPartial, RequiredSWDestPartial, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import path from 'node:path'
import process from 'node:process'
import { normalizePath, resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { prepareTempFolder } from './prepare-temp-folder'

export async function prepareSwNamesAndGlobDirectory<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
) {
  let options: (GlobPartial & RequiredSWDestPartial) | undefined
  let swSrc: string | undefined
  let swType: SWType | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = ''
      options = ctx.resolvedOptions.generateSW as (GlobPartial & RequiredSWDestPartial)
      swType = ctx.resolvedOptions.generateSW!.swType
      break
    case 'inject-manifest':
      options = ctx.resolvedOptions.injectManifest as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      swType = ctx.resolvedOptions.injectManifest!.swType
      break
    case 'build-sw':
      options = ctx.resolvedOptions.buildSW as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.buildSW!.swSrc
      swType = ctx.resolvedOptions.buildSW!.swType
      break
  }

  if (options) {
    await prepareTempFolder(ctx)
    const internalDevOptions = ctx.dev.options!
    const folder = internalDevOptions.tempFolder
    const root = process.cwd()
    const outputFolder = path.resolve(process.cwd(), ctx.viteConfig.build.outDir)
    const relativeSwDest = path.relative(outputFolder, options.swDest)
    const devSWDest = normalizePath(path.relative(root, path.resolve(folder, relativeSwDest)))
    const {
      swDest,
      swDestPath,
      classicSWDest,
      classicSWDestPath,
      moduleSWDest,
      moduleSWDestPath,
    } = resolveSWNames(
      Object.assign({}, options, { swDest: devSWDest }),
      swSrc as string,
      ctx.strategy === 'generate-sw',
    )

    // todo: finish this
    // internalDevOptions.swName = internalDevOptions.swType
    internalDevOptions.globDirectory = normalizePath(path.relative(root, folder))
    internalDevOptions.swNames.devSWDest = devSWDest
    internalDevOptions.swNames.path = normalizePath(path.resolve(root, swDest))
    internalDevOptions.swNames.name = swDestPath
    internalDevOptions.swNames.classic = classicSWDestPath
    internalDevOptions.swNames.classicPath = normalizePath(path.resolve(root, classicSWDest))
    internalDevOptions.swNames.module = moduleSWDestPath
    internalDevOptions.swNames.modulePath = normalizePath(path.resolve(root, moduleSWDest))
  }
}
