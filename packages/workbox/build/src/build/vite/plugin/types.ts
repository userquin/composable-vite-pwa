import type { Strategy, WorkboxBuildConfiguration } from '../../../config/types'
import type { SWType } from '../../../types'

export type VitePWAPluginOptions<
  S extends Strategy,
  T extends SWType = 'classic',
> = Partial<WorkboxBuildConfiguration<S, T>>

export interface VitePWAPluginApi {
  generateSWAtDev: () => Promise<void>
}
