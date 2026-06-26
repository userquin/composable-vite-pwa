import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin } from 'vite'
import type { ViteLegacyNuxtPWAContext, ViteNuxtPWAContext } from '../internal-types'
import { prefixRegex } from 'rolldown/filter'

export function PwaRuntimeConfiguration<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: ViteNuxtPWAContext<UserStrategy, S, T> | ViteLegacyNuxtPWAContext<UserStrategy, S, T>,
): Plugin {
  const configuration = 'virtual:nuxt-pwa-configuration'
  const resolvedConfiguration = `\0${configuration}`
  return {
    name: 'vite-pwa:nuxt:runtime-configuration',
    enforce: 'pre',
    applyToEnvironment(environment) {
      return environment.config.consumer === 'client'
    },
    configResolved(config) {
      if (ctx.pwaCtx.bundler === 'vite-legacy' && config.build.ssr) {
        return
      }
      ctx.pwaCtx.envApi = ctx.pwaCtx.bundler === 'vite'
    },
    resolveId: {
      filter: { id: [prefixRegex(configuration)] },
      handler(id) {
        if (id === configuration) {
          return resolvedConfiguration
        }
      },
    },
    load: {
      filter: { id: [prefixRegex(resolvedConfiguration)] },
      handler(id) {
        if (id !== resolvedConfiguration) {
          return undefined
        }

        const { client, pwaCtx } = ctx

        let callBeforeRegisterHook = false
        const references: string[] = []
        const imports: string[] = []
        const functions: string[] = [
          `export function initializeDev() {}`,
          `export function activateSWSwitcherDev() {}`,
        ]
        if (pwaCtx.devEnvironment) {
          if (!pwaCtx.resolvedOptions.disable && pwaCtx.resolvedOptions.devOptions?.enabled) {
            references.push('/// <reference types="@composable-vite-pwa/unplugin-pwa/vite-hmr-entry-point" />')
            imports.push('import { registerDevSW, setDevPWASwitcherReady } from \'virtual:pwa-entry-point-loaded\'')
            functions.length = 0
            functions.push(`export function initializeDev() { registerDevSW() }`)
            functions.push(`export function activateSWSwitcherDev() { setDevPWASwitcherReady() }`)
            const internalDevOptions = pwaCtx.dev.options!
            if (internalDevOptions.swNames.hasNames) {
              callBeforeRegisterHook = true
            }
          }
        }
        else {
          if (!pwaCtx.resolvedOptions.disable) {
            callBeforeRegisterHook = true
          }
        }

        const display = typeof pwaCtx.resolvedOptions.manifest !== 'boolean' ? pwaCtx.resolvedOptions.manifest?.display ?? 'standalone' : 'standalone'
        const installPrompt = (typeof client.installPrompt === 'undefined' || client.installPrompt === false)
          ? undefined
          : (client.installPrompt === true || client.installPrompt.trim() === '')
              ? 'vite-pwa:hide-install'
              : client.installPrompt.trim()

        const exports: string[] = [
          `export const callBeforeRegisterHook = ${callBeforeRegisterHook}`,
          `export const enabled = ${client.registerPlugin}`,
          `export const display = '${display}'`,
          `export const installPrompt = ${JSON.stringify(installPrompt)}`,
          `export const periodicSyncForUpdates = ${typeof client.periodicSyncForUpdates === 'number' ? client.periodicSyncForUpdates : 0}`,
        ]

        return `${references.join('\n')}
${imports.join('\n')}

${functions.join('\n')}

${exports.join('\n')}
`
      },
    },
  }
}
