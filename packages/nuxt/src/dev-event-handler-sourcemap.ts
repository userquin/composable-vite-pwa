import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { NuxtPWAContext } from './internal-types'
import { promises as fs } from 'node:fs'
import { defineHandler } from 'nitro'

// TODO: remove once tested with nuxt 3
export function devEventHandlerSourcemap<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(
  ctx: NuxtPWAContext<B, UserStrategy, T>,
) {
  return defineHandler(async (event) => {
    const url = event.url?.pathname
    if (!url || !url.endsWith('.js.map')) {
      return
    }

    const internalDevOptions = ctx.dev.options!
    const map = internalDevOptions.swAssetsPaths.get(url)
    if (!map) {
      return
    }

    event.res.status = 200
    event.res.headers.set('Content-Type', 'application/json')
    event.res.headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
    return await fs.readFile(map, 'utf-8')
  })
}
