import type { Bundler, PWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import type { PwaModuleOptions } from './types'
import { getNuxtVersion } from '@nuxt/kit'
import pc from 'picocolors'
import semver from 'semver'

export async function createNuxtPwaContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
  PC extends PWAPluginContext<B, UserStrategy, S, T>,
  NPWAC extends NuxtPWAContext<
    B,
    UserStrategy,
    S,
    T,
    PC
  >,
>(
  options: PwaModuleOptions<UserStrategy, T>,
  nuxt: Nuxt,
): Promise<NPWAC> {
  const nuxtVersion = getNuxtVersion(nuxt)
  if (nuxt.options.builder === '@nuxt/vite-builder') {
    const enableEnvApi = semver.major(nuxtVersion) === 4 && nuxt.options.experimental.viteEnvironmentApi
    if (enableEnvApi) {
      console.log(
        await Promise.all([
          import('vite').then(({ version }) => version).catch(() => undefined),
          import('@composable-vite-pwa/workbox-build/build/vite').then(({
            detect,
          }) => detect({
            vite: true,
          }).then(({ vite }) => (vite))),
        ]),
      )
    }
    if (semver.major(nuxtVersion) >= 5 || enableEnvApi) {
      return await import('./builders/vite/create-vite-nuxt-pwa-context').then(({
        createViteNuxtPwaContext,
      }) => createViteNuxtPwaContext(
        nuxtVersion,
        options,
        nuxt,
      ) as unknown as NPWAC)
    }

    // fallback to legacy
    return await import('./builders/vite/create-vite-legacy-nuxt-pwa-context').then(({
      createViteLegacyNuxtPwaContext,
    }) => createViteLegacyNuxtPwaContext(
      nuxtVersion,
      options,
      nuxt,
    ) as unknown as NPWAC)
  }

  throw new Error([
    '',
    pc.cyan(`[Vite PWA for Nuxt] Bundler '${nuxt.options.builder}' not yet supported`),
  ].join('\n'))
}
