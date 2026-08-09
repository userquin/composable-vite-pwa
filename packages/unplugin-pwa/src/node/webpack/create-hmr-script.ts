import type { PWAPluginContext } from '../context-types'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildPwaAsset } from '../build-pwa-asset'

export async function createWebpackHmrScript(ctx: PWAPluginContext<'webpack', any, any>): Promise<string> {
  const base = path.dirname(fileURLToPath(import.meta.url))
  const source = await fs.readFile(path.resolve(base, '../../client/dev/webpack/hmr.js'), 'utf-8')
  return await buildPwaAsset(source, ctx)
}
