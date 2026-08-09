import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type {
  GlobPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../internal-types'
import path from 'node:path'
import process from 'node:process'
import {
  resolveSWNames,
} from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { normalizePath } from 'vite'

export function prepareBuildSwNames<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: NuxtPWAContext<B, UserStrategy, T>,
  nitroPublicDir: string,
) {
  let swSrc: string | undefined
  let options: (GlobPartial & RequiredSWDestPartial) | undefined
  switch (ctx.strategy) {
    case 'generate-sw':
      swSrc = 'x'
      options = ctx.resolvedOptions.generateSW as (GlobPartial & RequiredSWDestPartial)
      break
    case 'inject-manifest':
      swSrc = ctx.resolvedOptions.injectManifest!.swSrc
      options = ctx.resolvedOptions.injectManifest as (GlobPartial & RequiredSWDestPartial)
      break
    case 'build-sw':
      swSrc = ctx.resolvedOptions.buildSW!.swSrc
      options = ctx.resolvedOptions.buildSW as (GlobPartial & RequiredSWDestPartial)
      break
  }

  if (options) {
    const {
      swDest,
      classicSWDest,
      moduleSWDest,
    } = resolveSWNames(
      normalizePath(path.relative(process.cwd(), path.resolve(nitroPublicDir, options.swDest as string))),
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
