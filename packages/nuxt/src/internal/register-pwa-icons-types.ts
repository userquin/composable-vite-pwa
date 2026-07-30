import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import type { DtsInfo } from './pwa-icons-helper'
import { addTypeTemplate } from '@nuxt/kit'
import { addPwaTypeTemplate, pwaIcons } from './pwa-icons-helper'

export async function registerPwaIconsTypes<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
) {
  const options = ctx.resolvedOptions
  // we need to resolve first the PWA assets options: the resolved options set at pwa-icons::resolvePWAAssetsOptions
  const pwaAssets = options.pwaAssets && !options.pwaAssets.disabled
  let dts: DtsInfo | undefined
  if (pwaAssets) {
    try {
      const { preparePWAIcons } = await import('./prepare-pwa-icons')
      dts = await preparePWAIcons<B, UserStrategy, T, NPWAC>(nuxt, ctx)
    }
    catch {
      dts = undefined
    }
  }

  const dtsContent = dts?.dts
  if (dtsContent) {
    addTypeTemplate({
      write: true,
      filename: 'pwa-icons/pwa-icons.d.ts',
      options: {
        nuxt: true,
        node: true,
      },
      getContents: () => dtsContent,
    })
  }
  else {
    addTypeTemplate({
      write: true,
      filename: 'pwa-icons/pwa-icons.d.ts',
      options: {
        nuxt: true,
        node: true,
      },
      getContents: () => pwaIcons(),
    })
  }

  addPwaTypeTemplate('PwaTransparentImage', dts?.transparent)
  addPwaTypeTemplate('PwaMaskableImage', dts?.maskable)
  addPwaTypeTemplate('PwaFaviconImage', dts?.favicon)
  addPwaTypeTemplate('PwaAppleImage', dts?.apple)
  addPwaTypeTemplate('PwaAppleSplashScreenImage', dts?.appleSplashScreen)
}
