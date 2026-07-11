import type { VitePWAOptions, VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'

export type ReactRouterPWAOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = Omit<VitePWAOptions<UserStrategy, T>, 'injectRegister'> & {
  injectRegister: false
  /**
   * Include React Router SSR virtual info?
   *
   * If you enable SSR, you can access React Router info in your service worker via `virtual:vite-pwa/react-router/sw` virtual module, will expose the followinf info:
   * -
   *
   * **NOTE**: the virtual will have the configuration only available if you set this option to `true` and using `buildSW` strategy.
   *
   * @default false
   */
  ssrRuntimeInfo?: boolean
}
