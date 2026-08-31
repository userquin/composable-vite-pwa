import type { Bundler } from '@composable-vite-pwa/unplugin-pwa/node/context-types'
import type { VitePWAStrategy } from '@composable-vite-pwa/unplugin-pwa/node/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { Nuxt } from '@nuxt/schema'
import type { NuxtPWAContext } from './internal-types'
import type { PwaModuleOptions } from './types'
import { getNuxtVersion } from '@nuxt/kit'
import pc from 'picocolors'
import { getMajor } from 'verkit'

export async function createNuxtPwaContext<
  B extends Bundler,
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
  NPWAC extends NuxtPWAContext<B, UserStrategy, T>,
>(
  options: PwaModuleOptions<UserStrategy, T>,
  nuxt: Nuxt,
  moduleResolver: ReturnType<typeof import('@nuxt/kit')['createResolver']>,
): Promise<NPWAC> {
  const nuxtVersion = getNuxtVersion(nuxt)
  let buildAssetsDir = nuxt.options.app.buildAssetsDir ?? '_nuxt/'
  if (buildAssetsDir[0] === '/') {
    buildAssetsDir = buildAssetsDir.slice(1)
  }
  if (buildAssetsDir[buildAssetsDir.length - 1] !== '/') {
    buildAssetsDir += '/'
  }

  if (nuxt.options.builder === '@nuxt/vite-builder') {
    const enableEnvApi = getMajor(nuxtVersion) === 4 && nuxt.options.experimental.viteEnvironmentApi
    /* if (enableEnvApi) {
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
    } */
    if (getMajor(nuxtVersion) >= 5 || enableEnvApi) {
      return await import('./builders/vite/create-vite-nuxt-pwa-context').then(({
        createViteNuxtPwaContext,
      }) => createViteNuxtPwaContext(
        nuxtVersion,
        buildAssetsDir,
        options,
        nuxt,
        moduleResolver,
      ) as unknown as NPWAC)
    }

    // fallback to legacy
    return await import('./builders/vite/create-vite-legacy-nuxt-pwa-context').then(({
      createViteLegacyNuxtPwaContext,
    }) => createViteLegacyNuxtPwaContext(
      nuxtVersion,
      buildAssetsDir,
      options,
      nuxt,
      moduleResolver,
    ) as unknown as NPWAC)
  }

  throw new Error([
    '',
    pc.cyan(`[Nuxt PWA] Bundler '${nuxt.options.builder}' not yet supported`),
  ].join('\n'))
}
