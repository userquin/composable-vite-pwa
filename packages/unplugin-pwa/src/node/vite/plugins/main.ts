import type {
  SWType,
} from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { exactRegex, prefixRegex } from '@rolldown/pluginutils'
import {
  DEV_SW_VIRTUAL_VIRTUAL,
  RESOLVED_DEV_SW_VIRTUAL_VIRTUAL,
  VIRTUAL_MODULES,
  VIRTUAL_MODULES_MAP,
  VIRTUAL_MODULES_RESOLVE_PREFIX,
} from '../../constants'
import { generateVirtualModule } from '../../generate-virtual-module'
import { preparePWAContextDefaults } from '../helpers'

export function MainPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  let forClient = false
  return {
    name: 'unplugin-pwa:main',
    enforce: 'pre',
    /* configEnvironment(_name, config) {
      // todo: review returned options here
      if (config.consumer === 'server') {
        if (ctx.bundler === 'vite-legacy') {
          return {
            build: {
              rollupOptions: {
                external: [...Array.from(Object.keys(VIRTUAL_MODULES_MAP)), DEV_SW_VIRTUAL, DEV_SW_VIRTUAL_VIRTUAL],
              },
            },
          }
        }

        return {
          build: {
            rolldownOptions: {
              external: [
                ...Array.from(Object.keys(VIRTUAL_MODULES_MAP)),
                DEV_SW_VIRTUAL,
                DEV_SW_VIRTUAL_VIRTUAL,
              ],
            },
          },
        }
      }
    },
    config(_, { isSsrBuild }) {
      // todo: review returned options here
      if (ctx.bundler === 'vite-legacy' && isSsrBuild) {
        return
      }

      if (ctx.bundler === 'vite-legacy') {
        return {
          build: {
            rollupOptions: {
              external: [...Array.from(Object.keys(VIRTUAL_MODULES_MAP)), DEV_SW_VIRTUAL, DEV_SW_VIRTUAL_VIRTUAL],
            },
          },
        }
      }

      return {
        build: {
          rolldownOptions: {
            external: [...Array.from(Object.keys(VIRTUAL_MODULES_MAP)), DEV_SW_VIRTUAL, DEV_SW_VIRTUAL_VIRTUAL],
          },
        },
      }
    }, */
    configEnvironment(_name, config) {
      if (ctx.envApi) {
        forClient = config.consumer === 'client'
      }
    },
    async configResolved(config) {
      ctx.devEnvironment = !(config.command === 'build')
      if (ctx.envApi) {
        if (forClient) {
          ctx.viteConfig = config
        }
      }
      else {
        if (!config.build.ssr) {
          ctx.viteConfig = config
        }
      }

      if (ctx.externalConfigurationLoader) {
        return
      }

      await preparePWAContextDefaults(forClient, config, ctx)
    },
    resolveId: {
      filter: { id: [prefixRegex('virtual:pwa-register'), exactRegex(DEV_SW_VIRTUAL_VIRTUAL)] },
      handler(id) {
        /* if (!ctx.envApi && ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
          return
        } */

        // resolve this at build time: won't be resolved by dev plugin
        if (!ctx.devEnvironment && id === DEV_SW_VIRTUAL_VIRTUAL) {
          return RESOLVED_DEV_SW_VIRTUAL_VIRTUAL
        }

        // condition is kept for backward compatibility for below Vite v6.3
        return VIRTUAL_MODULES.includes(id) ? VIRTUAL_MODULES_RESOLVE_PREFIX + id : undefined
      },
    },
    load: {
      filter: { id: [prefixRegex(VIRTUAL_MODULES_RESOLVE_PREFIX), exactRegex(RESOLVED_DEV_SW_VIRTUAL_VIRTUAL)] },
      async handler(id) {
        /* if (!ctx.envApi && ctx.bundler === 'vite-legacy' && ctx.viteConfig.build.ssr) {
          return
        } */

        // resolve this at build time: won't be resolved by dev plugin
        if (!ctx.devEnvironment && id === RESOLVED_DEV_SW_VIRTUAL_VIRTUAL) {
          return `export function registerDevSW() {}\nexport function setDevPWASwitcherReady() {}`
        }

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
