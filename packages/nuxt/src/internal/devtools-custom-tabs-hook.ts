import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from '../internal-types'
import {
  INSPECTOR_BASE_PATH,
  INSPECTOR_BASE_PATH_URL,
} from '@composable-vite-pwa/unplugin-pwa/node/constants'

export function devtoolsCustomTabsHook<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
): import('@nuxt/schema').NuxtHooks['devtools:customTabs'] {
  return (tabs) => {
    // when inspector is vite-devtools, consumer should use nuxt devtools v4
    if (ctx.resolvedOptions.devOptions?.inspector === 'standalone') {
      tabs.push({
        title: 'Vite PWA Inspector',
        name: 'vite-pwa:nuxt:inspector',
        icon: `${INSPECTOR_BASE_PATH}/icon_gray.svg`,
        // icon: {
        //   light: `${INSPECTOR_BASE_PATH}/icon_light.svg`,
        //   dark: `${INSPECTOR_BASE_PATH}/icon_dark.svg`,
        // },
        view: {
          type: 'iframe',
          src: INSPECTOR_BASE_PATH_URL,
        },
      })
    }
  }
}
