import type {
  ResolvedBuildSW,
  ResolvedGenerateSW,
  ResolvedInjectManifest,
  VitePWAStrategy,
} from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import type {
  BasePartial,
  GlobPartial,
  OptionalGlobDirectoryPartial,
  RequiredSWDestPartial,
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { TanStackPWAOptions } from './types'
import process from 'node:process'
import { createVitePWAContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'

// eslint-disable-next-line ts/ban-ts-comment
// @ts-ignore ignore when nitro v3 is not installed
export type NitroType = import('nitro/types').Nitro

export type TanStackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = VitePWAPluginContext<'vite', UserStrategy, T> & {
  tanstack: {
    clientOutputBuild: string
    nitro?: NitroType
  }
}

export function createTanStackPWAContext<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  options: Partial<TanStackPWAOptions<UserStrategy, T>>,
): TanStackPWAContext<UserStrategy, T> {
  // tanstack pwa doesn't support inject register
  options.injectRegister = false

  const ctx = Object.assign(
    createVitePWAContext(true, options),
    {
      hmrRequiresSwitcher: true,
      tanstack: {
        clientOutputBuild: undefined!,
      },
    },
  ) as TanStackPWAContext<UserStrategy, T>

  ctx.configurePWAOptions = async (_forClient, resolvedConfig) => {
    if (ctx.devEnvironment) {
      return undefined
    }
    ctx.outDir = ctx.tanstack.clientOutputBuild || ctx.outDir
    if (ctx.outDir.endsWith('/')) {
      ctx.outDir = ctx.outDir.slice(0, ctx.outDir.length - 1)
    }
    ctx.resolvedOptions.outDir = ctx.outDir
    const immutableAssets = resolvedConfig.build.assetsDir ?? 'assets/'

    let options: Partial<BasePartial & GlobPartial & OptionalGlobDirectoryPartial & RequiredSWDestPartial> | undefined
    switch (ctx.strategy) {
      case 'generate-sw':
        ctx.resolvedOptions.generateSW ??= {} as ResolvedGenerateSW<any, any>
        options = ctx.resolvedOptions.generateSW
        if (!('navigateFallback' in ctx.resolvedOptions.generateSW!)) {
          ctx.resolvedOptions.generateSW!.navigateFallback = ctx.base ?? '/'
        }
        break
      case 'inject-manifest':
        ctx.resolvedOptions.injectManifest ??= {} as ResolvedInjectManifest<any, any>
        options = ctx.resolvedOptions.injectManifest
        break
      case 'build-sw':
        ctx.resolvedOptions.buildSW ??= {} as ResolvedBuildSW<any, any>
        options = ctx.resolvedOptions.buildSW
        break
    }

    const cwd = process.cwd()

    if (!options) {
      return {
        cwd,
        outDir: ctx.outDir,
        immutableAssets,
      }
    }

    options.globDirectory = ctx.outDir

    if (!('globPatterns' in options)) {
      options.globPatterns = ['**/*.{js,css,html}']
    }

    // todo: fix this
    if (ctx.resolvedOptions.pwaAssets) {
      ctx.resolvedOptions.pwaAssets.integration = {
        baseUrl: ctx.base,
        publicDir: resolvedConfig.publicDir || 'public',
        outDir: ctx.outDir,
      }
    }

    options.manifestTransforms ??= []
    options.manifestTransforms.push(createManifestTransform(
      ctx.base || '/',
    ))

    if (ctx.tanstack.nitro) {
      // todo: add routes config or maybe at nitro?

    }

    // astro use the same vite folder
    return {
      cwd,
      outDir: ctx.outDir,
      immutableAssets,
    }
  }

  return ctx
}

function createManifestTransform(
  base: string,
): import('@composable-vite-pwa/workbox-build/types').ManifestTransform {
  return async (entries) => {
    // todo: change this and use loop
    const regexp = /\.html$/
    for (const e of entries) {
      if (!e.url.endsWith('.html')) {
        continue
      }
      const url = e.url.startsWith('/') ? e.url.slice(1) : e.url
      if (url === 'index.html') {
        e.url = base
      }
      else {
        let parts = url.split('/')
        if (parts.length > 1 && parts[parts.length - 1] === 'index.html') {
          parts = parts.slice(0, parts.length - 1)
        }
        else {
          parts[parts.length - 1] = parts[parts.length - 1]!.replace(regexp, '')
        }
        e.url = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : parts[0] as string
      }
    }

    return { manifest: entries, warnings: [] }
  }
}
