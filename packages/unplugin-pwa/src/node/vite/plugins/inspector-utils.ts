import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { VitePWAStrategy } from '../../types'
import type {
  ViteBundler,
  VitePWAPluginContext,
} from '../vite-context'
import path from 'node:path'
import { normalizePath } from '@composable-vite-pwa/workbox-build/utils/resolve-sw-names'
import packageJson from '../../../../package.json' with { type: 'json' }

export function preparePWAConfigurationData<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>) {
  const resolvedOptions = ctx.resolvedOptions
  const devOptions = resolvedOptions.devOptions

  return {
    version: packageJson.version,
    base: ctx.base,
    swEnabled: ctx.resolvedOptions.disable === false,
    strategy: ctx.strategy,
    swType: resolvedOptions.swType,
    swDevEnabled: devOptions?.enabled === true,
    currentSWType: ctx.dev.options.swType,
    swNames: ctx.dev.options.swNames,
    manifest: resolvedOptions.manifest,
  }
}

export function prepareServiceWorkerData<
  UserStrategy extends VitePWAStrategy,
  T extends SWType,
>(ctx: VitePWAPluginContext<ViteBundler, UserStrategy, T>) {
  const root = ctx.rootDir
  const injectManifest = ctx.strategy === 'inject-manifest'
  const devOptions = ctx.resolvedOptions.devOptions
  let chunks = devOptions?.enabled === true && ctx.dev.options?.swAssetKeys
    ? [...ctx.dev.options.swAssetKeys].filter(d => !d.endsWith('.map'))
    : undefined

  let dependencies = [...ctx.sources].map(d => normalizePath(path.relative(root, d)))

  if (injectManifest) {
    if (chunks) {
      const swName = `${ctx.base}${ctx.dev.options.swNames.name}`
      chunks = chunks.map(c => c === swName ? c : normalizePath(path.relative(root, c)))
    }
    const filename = ctx.resolvedOptions.injectManifest!.swSrc
    dependencies = dependencies.filter(c => c !== filename)
  }

  return {
    swType: devOptions?.enabled === true ? ctx.dev.options?.swType : undefined,
    chunks,
    dependencies,
  }
}
