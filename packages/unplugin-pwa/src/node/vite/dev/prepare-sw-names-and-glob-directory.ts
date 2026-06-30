import type { GlobPartial, RequiredSWDestPartial, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import path from 'node:path'
import process from 'node:process'
import { normalizePath, resolveSWNames } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { isDualServiceWorker } from '../../dual-sw-utilities'
import { prepareTempFolder } from './prepare-temp-folder'

/**
 * Prepare the service worker names, the glob directory and the temp folder.
 *
 * **NOTE**: if the PWA plugin context has `swNames.hasNames` set to `true` at the dev options, this function will return immediately.
 *
 * @param ctx The PWA Vite plugin context.
 */
export async function prepareSwNamesAndGlobDirectory<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>,
) {
  if (ctx.dev.options.swNames.hasNames) {
    return
  }
  let options: (GlobPartial & RequiredSWDestPartial) | undefined
  let swSrc: string | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = ''
      options = ctx.resolvedOptions.generateSW as (GlobPartial & RequiredSWDestPartial)
      break
    case 'inject-manifest':
      options = ctx.resolvedOptions.injectManifest as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      break
    case 'build-sw':
      options = ctx.resolvedOptions.buildSW as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.buildSW!.swSrc
      break
  }

  if (options) {
    await prepareTempFolder(ctx)
    const internalDevOptions = ctx.dev.options!
    const folder = internalDevOptions.tempFolder
    const root = process.cwd()
    let relativeSwDest: string | undefined
    let devSWDest: string
    if (path.isAbsolute(ctx.outDir)) {
      devSWDest = normalizePath(path.relative(root, path.resolve(folder, options.swDest)))
    }
    else {
      const outputFolder = path.resolve(process.cwd(), ctx.outDir)
      relativeSwDest = path.relative(outputFolder, options.swDest)
      devSWDest = normalizePath(path.relative(root, path.resolve(folder, relativeSwDest)))
    }

    const {
      swDest,
      swDestPath,
      classicSWDest,
      classicSWDestPath,
      moduleSWDest,
      moduleSWDestPath,
    } = resolveSWNames(
      devSWDest,
      swSrc as string,
      ctx.strategy === 'generate-sw',
    )

    if (isDualServiceWorker(ctx)) {
      if (ctx.resolvedOptions.devOptions?.type === 'module') {
        internalDevOptions.swName = moduleSWDest
        internalDevOptions.swType = 'module'
      }
      else {
        internalDevOptions.swName = classicSWDest
        internalDevOptions.swType = 'classic'
      }
    }
    else {
      internalDevOptions.swName = swDest
      internalDevOptions.swType = ctx.resolvedOptions.devOptions?.type === 'module'
        ? 'module'
        : 'classic'
    }
    internalDevOptions.globDirectory = normalizePath(path.relative(root, folder))
    internalDevOptions.swNames.devSWDest = devSWDest
    internalDevOptions.swNames.path = normalizePath(path.resolve(root, swDest))
    internalDevOptions.swNames.name = swDestPath
    internalDevOptions.swNames.classic = classicSWDestPath
    internalDevOptions.swNames.classicPath = normalizePath(path.resolve(root, classicSWDest))
    internalDevOptions.swNames.module = moduleSWDestPath
    internalDevOptions.swNames.modulePath = normalizePath(path.resolve(root, moduleSWDest))
    internalDevOptions.swNames.hasNames = true
  }
}
