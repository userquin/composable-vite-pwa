import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { ResolvedPWAAssetsOptions, VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { UserConfig } from '@vite-pwa/assets-generator/config'
import type { NuxtPWAContext } from '../internal-types'
import type { DtsInfo } from './pwa-icons-helper'
import fs from 'node:fs'
import { access, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { instructions } from '@vite-pwa/assets-generator/api/instructions'
import { loadConfig } from '@vite-pwa/assets-generator/config'
import { generatePwaImageType, pwaIcons } from './pwa-icons-helper'

export async function preparePWAIconTypes<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  nuxt: Nuxt,
  ctx: NPWAC,
) {
  const options = ctx.resolvedOptions
  if (!options.pwaAssets || options.pwaAssets.disabled)
    return

  const configuration = await resolvePWAAssetsOptions<
    B,
    UserStrategy,
    T,
    NPWAC
  >(nuxt, ctx)
  if (!configuration || configuration.disabled)
    return

  // use the same logic vite-plugin-pwa uses to load the configuration
  const root = nuxt.options.vite.root ?? process.cwd()
  const { config, sources } = await loadConfiguration(root, configuration)
  if (!config.preset)
    return

  const {
    preset,
    images,
    headLinkOptions: userHeadLinkOptions,
  } = config
  if (!images)
    return

  if (Array.isArray(images) && (!images.length || images.length > 1))
    return

  const useImage = Array.isArray(images) ? images[0] : images
  const imageFile = await tryToResolveImage<
    B,
    UserStrategy,
    T,
    NPWAC
  >(nuxt, ctx, useImage as string)
  const publicDir = ctx.publicDir
  const imageName = path.relative(publicDir, imageFile)

  const xhtml = userHeadLinkOptions?.xhtml === true
  const includeId = userHeadLinkOptions?.includeId === true
  const assetsInstructions = await instructions({
    imageResolver: () => readFile(imageFile),
    imageName,
    preset,
    faviconPreset: userHeadLinkOptions?.preset,
    htmlLinks: { xhtml, includeId },
    basePath: ctx.base,
    resolveSvgName: userHeadLinkOptions?.resolveSvgName ?? (name => path.basename(name)),
  })
  const transparentNames = Object.values(assetsInstructions.transparent).map(({ name }) => name)
  const maskableNames = Object.values(assetsInstructions.maskable).map(({ name }) => name)
  const faviconNames = Object.values(assetsInstructions.favicon).map(({ name }) => name)
  const appleNames = Object.values(assetsInstructions.apple).map(({ name }) => name)
  const appleSplashScreenNames = Object.values(assetsInstructions.appleSplashScreen).map(({ name }) => name)
  const dts = {
    dts: pwaIcons({
      transparent: transparentNames,
      maskable: maskableNames,
      favicon: faviconNames,
      apple: appleNames,
      appleSplashScreen: appleSplashScreenNames,
    }),
    transparent: generatePwaImageType('PwaTransparentImage', transparentNames),
    maskable: generatePwaImageType('PwaMaskableImage', maskableNames),
    favicon: generatePwaImageType('PwaFaviconImage', faviconNames),
    apple: generatePwaImageType('PwaAppleImage', appleNames),
    appleSplashScreen: generatePwaImageType('PwaAppleSplashScreenImage', appleSplashScreenNames),
  } satisfies DtsInfo

  if (nuxt.options.dev && nuxt.options.ssr) {
    // restart nuxt dev server when the configuration files change
    sources.forEach(source => nuxt.options.watch.push(normalizePath(source)))
  }

  return dts
}

async function resolvePWAAssetsOptions<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  nuxt: Nuxt,
  ctx: NPWAC,
) {
  const options = ctx.consumerOptions
  if (!options.pwaAssets)
    return

  const {
    disabled: useDisabled,
    config,
    preset,
    image,
    htmlPreset = '2023',
    overrideManifestIcons = false,
    includeHtmlHeadLinks = true,
    injectThemeColor = true,
    integration,
  } = options.pwaAssets ?? {}

  const disabled = !(useDisabled === true) ? false : (!config && !preset)
  let useImage: string
  if (image) {
    useImage = await tryToResolveImage<
      B,
      UserStrategy,
      T,
      NPWAC
    >(nuxt, ctx, image)
  }
  else {
    useImage = path.resolve(ctx.publicDir, 'favicon.svg')
  }

  // pwa plugin will use vite.root, and so, we need to always resolve the image relative to srcDir
  // - Nuxt 3: srcDir === rootDir
  // - Nuxt 3 v4 compat mode or Nuxt 4+: srcDir = <rootDir>/app vite.root set to srcDir
  useImage = path.relative(nuxt.options.srcDir, useImage)

  // prepare
  options.pwaAssets = {
    disabled,
    config: disabled || !config ? false : config,
    preset: disabled || config ? false : preset ?? 'minimal-2023',
    image: useImage,
    htmlPreset,
    overrideManifestIcons,
    includeHtmlHeadLinks,
    injectThemeColor,
    integration,
  }

  return <ResolvedPWAAssetsOptions>{
    disabled,
    config: disabled || !config ? false : config,
    preset: disabled || config ? false : preset ?? 'minimal-2023',
    images: [useImage],
    htmlPreset,
    overrideManifestIcons,
    includeHtmlHeadLinks,
    injectThemeColor,
    integration,
  }
}

async function loadConfiguration(
  root: string,
  pwaAssets: ResolvedPWAAssetsOptions,
) {
  if (pwaAssets.config === false) {
    return await loadConfig<UserConfig>(root, {
      config: false,
      preset: pwaAssets.preset as UserConfig['preset'],
      images: pwaAssets.images,
      logLevel: 'silent',
    })
  }

  return await loadConfig<UserConfig>(
    root,
    typeof pwaAssets.config === 'boolean'
      ? root
      : { config: pwaAssets.config },
  )
}

async function checkFileExists(pathname: string): Promise<boolean> {
  try {
    await access(pathname, fs.constants.R_OK)
  }
  catch {
    return false
  }

  return true
}

async function tryToResolveImage<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  nuxt: Nuxt,
  ctx: NPWAC,
  imageName: string,
): Promise<string> {
  for (const image of [
    // rootDir
    path.resolve(nuxt.options.rootDir, imageName),
    // srcDir
    path.resolve(nuxt.options.srcDir, imageName),
    // publicDir
    path.resolve(ctx.publicDir, imageName),
  ]) {
    if (await checkFileExists(image))
      return image
  }
  throw new Error(`PWA Assets image '${imageName}' cannot be resolved!`)
}
