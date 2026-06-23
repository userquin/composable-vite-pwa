import type { Strategy } from '@composable-vite-pwa/workbox-build/config/types'
import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { PwaHMRAsset } from '../../context-types'
import type { VitePWAStrategy } from '../../types'
import type { ViteBundler, VitePWAPluginContext } from '../vite-context'
import { promises as fs } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function customHMR<
  UserStrategy extends VitePWAStrategy,
  S extends Strategy,
  T extends SWType,
>(
  ctx: VitePWAPluginContext<ViteBundler, UserStrategy, S, T>,
  asset: PwaHMRAsset,
  source?: string,
): Promise<string> {
  const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : dirname(fileURLToPath(import.meta.url))

  let code: string
  let switcher: string

  if (asset === 'virtual-register-sw') {
    const result = await Promise.all([
      fs.readFile(
        resolve(
          _dirname,
          `../../../client/dev/vite/register.js`,
        ),
        'utf-8',
      ),
      fs.readFile(
        resolve(
          _dirname,
          `../../../client/dev/vite/switcher.js`,
        ),
        'utf-8',
      ),
      source === 'register'
        ? undefined
        : fs.readFile(
            resolve(
              _dirname,
              `../../../client/build/${source}.js`,
            ),
            'utf-8',
          ),
    ].filter(Boolean))

    if (source === 'register') {
      [code, switcher] = result as [string, string]
      return code.replace(
        'function registerSW(',
        `
${switcher}

function registerSW(
`,
      )
    }
    else {
      let fwSource: string
      ;[code, switcher, fwSource = ''] = result as [string, string, string]
      fwSource = fwSource.replace(/import\s+\{ registerSW\s+\}\s+from\s+ ['"]\.\/register\.js['"];?/, '')
      fwSource = fwSource.replace(
        'function useRegisterSW(',
        `
${code}

function useRegisterSW(      
`,
      )
      return `
${fwSource}

${switcher}    
`
    }
  }
  else {
    [code, switcher] = await Promise.all([
      fs.readFile(
        resolve(
          _dirname,
          `../../../client/dev/vite/registerSW.js`,
        ),
        'utf-8',
      ),
      fs.readFile(
        resolve(
          _dirname,
          `../../../client/dev/vite/switcher.js`,
        ),
        'utf-8',
      ),
    ])

    return `
${code}

${switcher}    
`
  }
}
