import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { PwaOptions } from '@composable-vite-pwa/vitepress/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { DefaultTheme, UserConfigExport } from 'vitepress'
import { withUserConfig } from './integration'

export type * from './types'

export async function withPwa<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  VPTheme = DefaultTheme.Config,
>(
  config: UserConfigExport<VPTheme>,
): Promise<UserConfigExport<VPTheme>> {
  if (typeof config === 'function') {
    return async (ctx) => {
      const userConfig = await config(ctx)
      return withUserConfig<UserStrategy, T, VPTheme>(userConfig)
    }
  }

  return withUserConfig<UserStrategy, T, VPTheme>(await config)
}

declare module 'vitepress' {
  interface UserConfig {
    pwa?: Partial<PwaOptions<VitePWAStrategy, SWType>>
  }
}
