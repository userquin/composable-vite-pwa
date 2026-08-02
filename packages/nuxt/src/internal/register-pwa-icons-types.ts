import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from '../internal-types'
import type { DtsInfo } from './pwa-icons-helper'
import { addTemplate } from '@nuxt/kit'
import { getMajor } from 'verkit'
import { addPWAIconsPluginTemplate, addPwaTemplate, pwaIcons } from './pwa-icons-helper'

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

  const templates: string[] = []

  const dtsContent = dts?.dts
  if (dtsContent) {
    templates.push(addTemplate({
      write: true,
      filename: 'pwa-icons/index.d.ts',
      getContents: () => dtsContent,
    }).filename)
  }
  else {
    templates.push(addTemplate({
      write: true,
      filename: 'pwa-icons/index.d.ts',
      getContents: () => pwaIcons(),
    }).filename)
  }

  templates.push(addPwaTemplate('PwaTransparentImageProps', dts?.transparent))
  templates.push(addPwaTemplate('PwaMaskableImageProps', dts?.maskable))
  templates.push(addPwaTemplate('PwaFaviconImageProps', dts?.favicon))
  templates.push(addPwaTemplate('PwaAppleImageProps', dts?.apple))
  templates.push(addPwaTemplate('PwaAppleSplashScreenImageProps', dts?.appleSplashScreen))

  // register pwa icons plugin
  addPWAIconsPluginTemplate(getMajor(ctx.nuxt.nuxtVersion) >= 4, pwaAssets === true)

  const pwaPath = addTemplate({
    filename: 'types/pwa.d.ts',
    write: true,
    getContents: () => templates.map(t => `/// <reference path="../${t}" />`).join('\n'),
  }).dst

  // register types templates
  nuxt.hook('prepare:types', (context) => {
    context.references.push({ path: pwaPath })
    context.references.push({ types: ctx.nuxt.moduleResolver.resolve('runtime/augments.d.ts') })
  })
}
