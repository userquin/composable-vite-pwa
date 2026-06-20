import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { PluginOption } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { prefixRegex } from '@rolldown/pluginutils'
import {
  VIRTUAL_MODULES,
  VIRTUAL_MODULES_MAP,
  VIRTUAL_MODULES_RESOLVE_PREFIX,
} from '../../constants'
import { generateVirtualModule } from '../../generate-virtual-module'
import { prepareDefaults } from '../helpers'
// import { generateRegisterSW } from '../modules'
// import { swDevOptions } from './dev'

export function MainPlugin<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>): PluginOption {
  return {
    name: 'unplugin-pwa:main',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    configureServer: () => {
      ctx.devEnvironment = true
    },
    async configResolved(config) {
      await prepareDefaults(config, ctx)
    },
    resolveId: {
      filter: { id: prefixRegex('virtual:pwa-register') },
      handler(id) {
        // condition is kept for backward compatibility for below Vite v6.3
        return VIRTUAL_MODULES.includes(id) ? VIRTUAL_MODULES_RESOLVE_PREFIX + id : undefined
      },
    },
    load: {
      filter: { id: prefixRegex(VIRTUAL_MODULES_RESOLVE_PREFIX) },
      async handler(id) {
        // condition is kept for backward compatibility for below Vite v6.3
        if (id.startsWith(VIRTUAL_MODULES_RESOLVE_PREFIX)) {
          id = id.slice(VIRTUAL_MODULES_RESOLVE_PREFIX.length)
        }
        else {
          return
        }

        if (VIRTUAL_MODULES.includes(id)) {
          ctx.useImportRegister = true
          return await generateVirtualModule(ctx, VIRTUAL_MODULES_MAP[id])
        }
      },
    },
  }
}
