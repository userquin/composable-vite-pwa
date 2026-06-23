import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function createHmrScript() {
  const _dirname = typeof __dirname !== 'undefined'
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url))

  return await fs.readFile(path.resolve(_dirname, '../../../client/dev/vite/hmr.js'), 'utf-8')
}
