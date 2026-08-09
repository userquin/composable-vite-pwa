import type { GlobPartial, RequiredSWDestPartial, SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Bundler, PWAPluginContext } from './context-types'
import type { VitePWAStrategy } from './types'
import path from 'node:path'
import {
  extractSwDestNameFromSource,
  resolveSWNames,
} from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { normalizePath } from './helpers'

export function prepareSwNames<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: PWAPluginContext<B, UserStrategy, T>,
) {
  let options: (GlobPartial & RequiredSWDestPartial) | undefined
  let filename: string | undefined
  let swSrc: string | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = ''
      // filename = ctx.resolvedOptions.generateSW!.swDest as string
      options = ctx.resolvedOptions.generateSW as (GlobPartial & RequiredSWDestPartial)
      filename = ctx.consumerOptions.filename = normalizePath(
        path.resolve(ctx.outDir, ctx.consumerOptions.filename || 'sw.js'),
      )
      ctx.resolvedOptions.generateSW!.swDest = filename
      break
    case 'inject-manifest':
      options = ctx.resolvedOptions.injectManifest as (GlobPartial & RequiredSWDestPartial)
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      filename = ctx.consumerOptions.filename = normalizePath(
        path.resolve(ctx.outDir, ctx.consumerOptions.filename || extractSwDestNameFromSource(swSrc as string)),
      )
      ctx.resolvedOptions.injectManifest!.swDest = filename
      // filename = ctx.consumerOptions.filename || extractSwDestNameFromSource(swSrc as string)
      // ctx.resolvedOptions.injectManifest!.swDest = filename
      break
    case 'build-sw':
      options = ctx.resolvedOptions.buildSW as (GlobPartial & RequiredSWDestPartial)
      swSrc = extractSwDestNameFromSource(ctx.resolvedOptions.buildSW!.swSrc as string)
      filename = ctx.consumerOptions.filename = normalizePath(
        path.resolve(ctx.outDir, ctx.consumerOptions.filename || extractSwDestNameFromSource(swSrc as string)),
      )
      ctx.resolvedOptions.buildSW!.swDest = filename
      // filename = ctx.consumerOptions.filename || extractSwDestNameFromSource(swSrc as string)
      // ctx.resolvedOptions.buildSW!.swDest = filename
      break
  }

  if (options) {
    const {
      swDest,
      classicSWDest,
      moduleSWDest,
    } = resolveSWNames(
      filename as string,
      swSrc as string,
      ctx.strategy === 'generate-sw',
    )
    ctx.swNames = {
      hasNames: true,
      name: swDest,
      classic: classicSWDest,
      module: moduleSWDest,
    }
  }
}
