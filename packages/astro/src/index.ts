import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { AstroIntegration } from 'astro'
import type { AstroPWAOptions } from './types'
import { BuildPwaAssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-pwa-assets'
import { BuildRegisterSWPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/build-register-sw'
import { DevPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev'
import { DevMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-middleware'
import { DevAssetsMiddlewarePlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/dev-pwa-assets-middleware'
import { InfoPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/info'
import { MainPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/main'
import { AssetsPlugin } from '@composable-vite-pwa/unplugin-pwa/node/vite/plugins/pwa-assets'
import { createAstroPWAContext } from './create-context'

export function AstroPWAIntegration<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(options: Partial<AstroPWAOptions<UserStrategy, T>> = {}): AstroIntegration {
  const ctx = createAstroPWAContext(options)

  return {
    name: '@vite-pwa/astro-integration',
    hooks: {
      'astro:config:setup': async ({ command, config, updateConfig }) => {
        ctx.astro.config = config
        switch (command) {
          case 'dev':
            ctx.astro.devEnvironment = true
            ctx.astro.doBuild = false
            break
          case 'preview':
          case 'sync':
            ctx.astro.config = config
            ctx.astro.devEnvironment = false
            ctx.astro.previewOrSync = true
            return
          case 'build':
            ctx.astro.config = config
            ctx.astro.devEnvironment = false
            ctx.astro.doBuild = true
            break
        }

        ctx.astro.scope = config.base ?? config.vite.base ?? '/'
        ctx.astro.trailingSlash = config.trailingSlash
        ctx.astro.useDirectoryFormat = config.build.format === 'directory'

        updateConfig({
          vite: {
            plugins: [
              MainPlugin(ctx),
              InfoPlugin(ctx),
              DevPlugin(ctx),
              DevMiddlewarePlugin(ctx),
              DevAssetsMiddlewarePlugin(ctx),
              AssetsPlugin(ctx),
              BuildPwaAssetsPlugin(ctx),
              BuildRegisterSWPlugin(ctx),
            ],
          },
        })
      },
      'astro:build:done': async () => {
        if (!ctx.astro.doBuild) {
          return
        }

        const pwaAssetsGenerator = await ctx.pwaAssetsGenerator
        if (pwaAssetsGenerator) {
          await pwaAssetsGenerator.generate()
        }

        await ctx.runBuild()
      },
    },
  }
}
