import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import { addTemplate } from '@nuxt/kit'

export function preparePwaRuntimeConfiguration<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  ctx: NPWAC,
  nuxt: Nuxt,
) {
  const filename = `pwa/runtime-configuration.ts`
  nuxt.options.build.transpile.push(`#build/${filename}`)
  addTemplate({
    filename,
    getContents: async () => {
      const { client } = ctx.nuxt
      let callBeforeRegisterHook = false
      const references: string[] = []
      const imports: string[] = []
      const functions: string[] = []
      if (ctx.devEnvironment) {
        if (!ctx.resolvedOptions.disable && ctx.resolvedOptions.devOptions?.enabled) {
          references.push('/// <reference types="@composable-vite-pwa/unplugin-pwa/vite-hmr-entry-point" />')
          imports.push('{ registerDevSW, setDevPWASwitcherReady } from \'virtual:pwa-entry-point-loaded\'')
          functions.push(`export function initializeDev() {
  registerDevSW()
}

export function activateSWSwitcherDev() {
  setDevPWASwitcherReady()
}`)
          const internalDevOptions = ctx.dev.options!
          if (internalDevOptions.swNames.hasNames) {
            callBeforeRegisterHook = true
          }
        }
        else {
          functions.push(`export function initializeDev() {}`)
          functions.push(`export function activateSWSwitcherDev() {}`)
        }
      }
      else {
        if (!ctx.resolvedOptions.disable) {
          callBeforeRegisterHook = true
        }
      }
      const display = typeof ctx.resolvedOptions.manifest !== 'boolean' ? ctx.resolvedOptions.manifest?.display ?? 'standalone' : 'standalone'
      const installPrompt = (typeof client.installPrompt === 'undefined' || client.installPrompt === false)
        ? undefined
        : (client.installPrompt === true || client.installPrompt.trim() === '')
            ? 'vite-pwa:hide-install'
            : client.installPrompt.trim()

      const exports: string[] = [
        `const callBeforeRegisterHook = ${callBeforeRegisterHook}`,
        `const enabled = ${client.registerPlugin}`,
        `const display = '${display}'`,
        `const installPrompt = ${JSON.stringify(installPrompt)}`,
        `const periodicSyncForUpdates = ${typeof client.periodicSyncForUpdates === 'number' ? client.periodicSyncForUpdates : 0}`,
      ]

      return `${references.join('\n')}
${imports.map(i => `import '${i}'`).join('\n')}

${functions.join('\n')}

${exports.map(e => `export ${e}`).join('\n')}
`
    },
    write: true,
  })
}
