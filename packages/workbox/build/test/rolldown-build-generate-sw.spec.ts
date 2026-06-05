import fs from 'node:fs/promises'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { buildSW as rolldownBuildSW } from '../src/build/rolldown/build-sw'
import { testWithSandbox } from './utils/test-sandbox'
import { createBuildSWPlugin } from './utils/plugin-utils'

describe('buildSW with Rolldown', () => {
  testWithSandbox('generates a service worker directly', async ({ sandbox }) => {
    const { root, dist } = sandbox

    const swPlugin = createBuildSWPlugin(root, dist, rolldownBuildSW, { rolldown: 'silent' })

    const build = await rolldown({
      input: path.resolve(root, 'src/index.js'),
      plugins: [swPlugin]
    })
    await build.write({ dir: dist })

    const swDest = normalizePath(path.resolve(dist, 'sw.js'))
    const swFilePromise = fs.readFile(swDest, 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('self.addEventListener')
    expect(swContent.length).toBeGreaterThan(0)
  })
})