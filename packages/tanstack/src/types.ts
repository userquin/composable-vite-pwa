import type { VitePWAOptions, VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'

export type TanStackPWAOptions<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
> = Omit<VitePWAOptions<UserStrategy, T>, 'injectRegister'> & {
  injectRegister: false
}
