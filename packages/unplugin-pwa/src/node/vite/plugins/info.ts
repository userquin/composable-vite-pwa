import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { exactRegex } from '@rolldown/pluginutils'
import {
  PWA_INFO_VIRTUAL,
  RESOLVED_PWA_INFO_VIRTUAL,
} from '../../constants'

export function InfoPlugin<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>): Plugin {
  return {
    name: 'unplugin-pwa:info',
    enforce: 'post',
    resolveId: {
      filter: { id: exactRegex(PWA_INFO_VIRTUAL) },
      handler(id) {
        // condition is kept for backward compatibility for below Vite v6.3
        if (id === PWA_INFO_VIRTUAL)
          return RESOLVED_PWA_INFO_VIRTUAL

        return id === PWA_INFO_VIRTUAL
          ? RESOLVED_PWA_INFO_VIRTUAL
          : undefined
      },
    },
    load: {
      filter: { id: exactRegex(RESOLVED_PWA_INFO_VIRTUAL) },
      async handler(id) {
        // condition is kept for backward compatibility for below Vite v6.3
        return id === RESOLVED_PWA_INFO_VIRTUAL
          ? await generatePwaInfo(ctx)
          : undefined
      },
    },
  }
}

// see info.d.ts on root
interface VirtualPwaInfo {
  pwaInDevEnvironment: boolean
  webManifest: {
    href: string
    useCredentials: boolean
    linkTag: string
  }
  registerSW?: {
    module: boolean
    mode: 'inline' | 'script' | 'script-defer'
    inlinePath: string
    registerPath: string
    scope: string
    type: 'classic' | 'module'
    scriptTag?: string
  }
}

async function generatePwaInfo<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>) {
  const webManifestData = ctx.webManifestData()
  if (!webManifestData)
    return 'export const pwaInfo = undefined;'

  const { href, useCredentials, toLinkTag } = webManifestData
  const registerSWData = await ctx.registerSWData()

  const entry: VirtualPwaInfo = {
    pwaInDevEnvironment: ctx.devEnvironment,
    webManifest: {
      href,
      useCredentials,
      linkTag: toLinkTag(),
    },
  }

  if (registerSWData) {
    const scriptTag = registerSWData.toScriptTag()
    if (scriptTag) {
      const { mode, inlinePath, registerPath, type, scope, module } = registerSWData
      entry.registerSW = {
        module,
        mode,
        inlinePath,
        registerPath,
        type,
        scope,
        scriptTag,
      }
    }
  }

  return `export const pwaInfo = ${JSON.stringify(entry)};`
}
