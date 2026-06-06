import fs from 'node:fs/promises'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { generateSW as rolldownGenerateSW } from '../src/build/rolldown/generate-sw'
import { createGenerateSWPlugin } from './utils/plugin-utils'
import { testWithSandbox } from './utils/test-sandbox'

describe('generateSW with Rolldown', () => {
  testWithSandbox('generates a service worker directly', async ({ sandbox }) => {
    const { root, dist } = sandbox

    const swPlugin = createGenerateSWPlugin<'rolldown'>(
      dist,
      rolldownGenerateSW,
      { rolldown: 'silent' },
    )

    async function buildAndClose() {
      const build = await rolldown({
        input: path.resolve(root, 'src/index.js'),
        plugins: [swPlugin],
      })
      await build.write({ dir: dist })
      await build.close()
      return true
    }

    await expect(buildAndClose()).resolves.toBe(true)

    const swDest = normalizePath(path.resolve(dist, 'sw.js'))
    const swFilePromise = fs.readFile(swDest, 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('index.js')
    expect(swContent).not.toContain('self.__WB_MANIFEST')
  })
})
