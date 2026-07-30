import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import type { DtsInfo } from './pwa-icons-helper'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import { generatePwaImageType, pwaIcons } from './pwa-icons-helper'

export async function preparePWAIcons<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  nuxt: Nuxt,
  ctx: NPWAC,
): Promise<DtsInfo | undefined> {
  const pwaAssetsContext = await ctx.pwaAssetsGenerator
  if (!pwaAssetsContext) {
    return undefined
  }
  const assetsInstructions = pwaAssetsContext.instructions()
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
    for (const source of pwaAssetsContext.sources()) {
      nuxt.options.watch.push(normalizePath(source))
    }
  }

  return dts
}
