import type {
  Bundler,
} from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import {
  addComponent,
  addPlugin,
} from '@nuxt/kit'
import { isGreaterOrEqual } from 'verkit'
import { buildPwaAssets } from './build-pwa-assets'
import { buildBeforeHook } from './internal/build-before-hook'
import { devtoolsCustomTabsHook } from './internal/devtools-custom-tabs-hook'
import { nitroConfigHook } from './internal/nitro-config-hook'
import { nitroInitHook } from './internal/nitro-init-hook'
import { prepareTypesHook } from './internal/prepare-types-hook'
import { addPWAIconsPluginTemplate } from './internal/pwa-icons-helper'

export async function prepareModule<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPC,
  nuxt: Nuxt,
) {
  const resolver = ctx.nuxt.moduleResolver

  ctx.base ??= ctx.consumerOptions.base || '/'
  ctx.consumerOptions.base ??= ctx.base
  ctx.consumerOptions.scope ??= ctx.base
  ctx.externalConfigurationLoader = true

  const runtimeDir = resolver.resolve('./runtime')
  nuxt.options.build.transpile.push(runtimeDir)

  nuxt.options.alias['#pwa'] = resolver.resolve(runtimeDir, 'composables/index')
  nuxt.options.build.transpile.push('#pwa')

  if (ctx.nuxt.client.registerPlugin) {
    addPlugin({
      src: resolver.resolve(runtimeDir, 'plugins/pwa.client'),
      mode: 'client',
    })
  }

  const pwaAssets = ctx.consumerOptions?.pwaAssets

  addPWAIconsPluginTemplate(!!pwaAssets && pwaAssets.disabled !== true)

  // hooks will run in this order
  // 1) configures nitroConfig at ctx.nuxt
  nuxt.hook('nitro:config', nitroConfigHook<B, UserStrategy, T, NPC>(ctx, nuxt))
  // 2) load configuration and prepare the PWA context: will configure pwa assets icons and runtime stuff
  nuxt.hook('nitro:init', nitroInitHook<B, UserStrategy, T, NPC>(ctx, nuxt, runtimeDir))
  // 3) add PWA types and registers composables
  nuxt.hook('prepare:types', prepareTypesHook<B, UserStrategy, T, NPC>(ctx, runtimeDir))
  // 4) prepare devtools tab: this hook runs between prepare:types and component:extend, cannot use build:before hook
  nuxt.hook('devtools:customTabs', devtoolsCustomTabsHook<B, UserStrategy, T, NPC>(ctx, nuxt))
  // 5) add PWA components (components:extend)
  addComponent({
    name: 'NuxtPwaAssets',
    filePath: resolver.resolve(runtimeDir, 'components/NuxtPwaAssets'),
  })
  addComponent({
    name: 'NuxtPwaManifest',
    filePath: resolver.resolve(runtimeDir, 'components/NuxtPwaManifest'),
  })
  // 6) add bundler stuff: for example, when using vite, will add unplugin-pwa plugins and some middlewares
  nuxt.hook('build:before', buildBeforeHook<B, UserStrategy, T, NPC>(ctx))

  // build SW when building/generating
  if (!nuxt.options.dev) {
    if (isGreaterOrEqual(ctx.nuxt.nuxtVersion, '3.8.0')) {
      // nuxt 5 should use nitro 'vite:before:compile' hook and maybe this hook is wrong
      // nuxt 5 has this new option experimental.nitroViteEnvironment to enable nitro/vite (v3)
      // maybe we even need a new hook at nitro v3
      nuxt.hook('nitro:build:public-assets', async () => {
        await buildPwaAssets<B, UserStrategy, T, NPC>(ctx)
      })
    }
    else {
      nuxt.hook('nitro:init', (nitro) => {
        nitro.hooks.hook('rollup:before', async () => {
          await buildPwaAssets<B, UserStrategy, T, NPC>(ctx)
        })
      })
      if (nuxt.options.nitro.static || (nuxt.options as any)._generate /* TODO: remove in future */) {
        nuxt.hook('close', async () => {
          await buildPwaAssets<B, UserStrategy, T, NPC>(ctx)
        })
      }
    }
  }
}
