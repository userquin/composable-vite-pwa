import type { Bundler, SWNames } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  prepareSwNamesAndGlobDirectory,
} from '@composable-vite-pwa/unplugin-pwa/node/vite/dev/prepare-sw-names-and-glob-directory'
import { prepareBuildSwNames } from './prepare-sw-names'

export async function prepareNitroRoutes<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(ctx: NPWAC, nuxt: Nuxt) {
  const nitroConfig = ctx.nuxt.nitroConfig

  const isDev = nuxt.options.dev
  let swDisabled = false
  if (isDev) {
    ctx.devEnvironment = true
    if (ctx.resolvedOptions.disable) {
      swDisabled = true
    }
    else {
      const devOptions = ctx.resolvedOptions.devOptions
      if (devOptions) {
        swDisabled = !(devOptions.enabled === true)
      }
      else {
        swDisabled = true
      }
    }
  }
  else {
    if (ctx.resolvedOptions.disable) {
      swDisabled = true
    }
    if (!swDisabled) {
      prepareBuildSwNames(
        ctx,
        ctx.outDir,
      )
    }
  }

  const webManifest = ctx.resolvedOptions.manifest
  let swNames: SWNames | undefined

  // prepare nitro public assets
  if (isDev) {
    if (!swDisabled) {
      // todo: move this module outside vite at unplugin-pwa
      await prepareSwNamesAndGlobDirectory<UserStrategy, T>(ctx as unknown as any)
      swNames = ctx.dev.options!.swNames
      const outDir = ctx.outDir

      await fs.mkdir(outDir, { recursive: true })
      nitroConfig.publicAssets = nitroConfig.publicAssets || []
      nitroConfig.publicAssets.push({
        dir: outDir,
        fallthrough: true,
        baseURL: ctx.base,
        maxAge: 0,
      })
    }
  }
  else {
    swNames = ctx.swNames
  }

  nitroConfig.routeRules = nitroConfig.routeRules || {}
  if (swNames?.hasNames) {
    if (ctx.resolvedOptions.swType === 'classic-and-module') {
      nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.classic)}`] = {
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
      nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.module)}`] = {
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
    }
    else {
      nitroConfig.routeRules[`${ctx.base}${path.basename(swNames.name)}`] = {
        headers: {
          'Cache-Control': 'public, max-age=0, must-revalidate',
        },
      }
    }
  }

  if ((nuxt.options.dev || ctx.nuxt.registerWebManifestInRouteRules) && webManifest) {
    nitroConfig.routeRules[`${ctx.base}${ctx.resolvedOptions.manifestFilename ?? 'manifest.webmanifest'}`] = {
      headers: {
        'Content-Type': 'application/manifest+json',
        'Cache-Control': 'public, max-age=0, must-revalidate',
      },
    }
  }
}
