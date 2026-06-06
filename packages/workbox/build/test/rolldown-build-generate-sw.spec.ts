import fs from 'node:fs/promises'
import path from 'node:path'
import { rolldown } from 'rolldown'
import { describe, expect } from 'vitest'
import { normalizePath } from '../src/build/builder/utils'
import { buildSW as rolldownBuildSW } from '../src/build/rolldown/build-sw'
import { createBuildSWPlugin } from './utils/plugin-utils'
import { testWithSandbox } from './utils/test-sandbox'

describe('buildSW with Rolldown', () => {
  testWithSandbox('generates a service worker directly', async ({ sandbox }) => {
    const { root, dist } = sandbox

    const swPlugin = createBuildSWPlugin<'rolldown'>(
      root,
      dist,
      rolldownBuildSW,
      { rolldown: 'silent' },
    )

    await expect(rolldown({
      input: path.resolve(root, 'src/index.js'),
      plugins: [swPlugin],
    }).then(build => build
      .write({ dir: dist })
      .catch(() => Promise.resolve(false))
      .then(() => build
        .close()
        .catch(() => Promise.resolve(false))
        .then(() => Promise.resolve(true)),
      ),
    )).resolves.toBe(true)

    const swDest = normalizePath(path.resolve(dist, 'sw.js'))
    const swFilePromise = fs.readFile(swDest, 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('index.js')
    expect(swContent).not.toContain('self.__WB_MANIFEST')
  })
})
