import type { InjectManifestStrategyOptions } from '../../../config/types'
import type { SWType } from '../../../types'
import type { BuildGenerateSWOptions } from '../../types'
import { devPluginName } from './plugin-context'

/**
 * Build the service worker at dev server.
 * **NOTE**: calling this on Vite build won't build the service worker.
 * @param resolvedConfig The resolve Vte configuration.
 * @param options The options to build the service worker.
 */
export async function generateSW<
  T extends SWType,
>(
  resolvedConfig: import('vite').ResolvedConfig,
  options: BuildGenerateSWOptions<T>,
) {
  await resolvedConfig.plugins.find(
    p => p && 'name' in p && p.name === devPluginName,
  )?.api?.generateSWAtDev?.(options)
}

/**
 * Inject the precache manifest to the service worker at dev server.
 * **NOTE**: calling this on Vite build won't inject the precache manifest to the service worker.
 * @param resolvedConfig The resolve Vte configuration.
 * @param options The options to inject the precache manifest to the service worker.
 */
export async function injectManifest(
  resolvedConfig: import('vite').ResolvedConfig,
  options: InjectManifestStrategyOptions,
) {
  await resolvedConfig.plugins.find(
    p => p && 'name' in p && p.name === devPluginName,
  )?.api?.injectManifest?.(options)
}
