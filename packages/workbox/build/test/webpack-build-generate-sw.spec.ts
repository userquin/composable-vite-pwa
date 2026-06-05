import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { it as base, describe, expect } from 'vitest'
import webpack from 'webpack'
import { normalizePath } from '../src/build/builder/utils'
import { WorkboxPlugin as WebpackWorkboxPlugin } from '../src/build/webpack'
import { createFixture } from './utils/webpack-utils'

const isWatchMode = process.env.VITEST_MODE === 'WATCH'

function runWebpack(config: webpack.Configuration): Promise<webpack.Stats> {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config)
    compiler.run((error, stats) => {
      compiler.close(() => {})
      if (error) {
        reject(error)
      }
      else {
        resolve(stats!)
      }
    })
  })
}

export const testWebpack = base.extend<{
  sandbox: { root: string, dist: string }
}>({
  // eslint-disable-next-line no-empty-pattern
  sandbox: async ({}, use) => {
    await createFixture('webpack', use)
  },
}).skipIf(isWatchMode)

describe('webpack WorkboxPlugin', () => {
  testWebpack('runs build-sw with webpack compiler context and relative paths', async ({ sandbox }) => {
    const { dist, root } = sandbox
    const stats = await runWebpack({
      mode: 'development',
      context: root,
      devtool: false,
      entry: './src/index.js',
      output: { filename: 'main.js', path: dist },
      plugins: [
        new WebpackWorkboxPlugin('build-sw', {
          buildSW: {
            swSrc: normalizePath(path.relative(process.cwd(), path.resolve(root, 'src/sw.js'))),
            swDest: normalizePath(path.relative(process.cwd(), 'sw.js')),
            globPatterns: ['**/*.js'],
            injectionPoint: 'globalThis.__WB_MANIFEST',
            inlineWorkboxRuntime: true,
            sourcemap: false,
            mode: 'development',
            logLevel: 'silent',
            bundlerLogLevel: { rolldown: 'silent' },
          },
        }),
      ],
    })
    expect(stats.toJson({ errors: true }).errors).toEqual([])

    const swFilePromise = fs.readFile(path.resolve(dist, 'sw.js'), 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('main.js')
  })

  testWebpack('loads external config files for webpack builds', async ({ sandbox }) => {
    const { dist, root } = sandbox
    const swSrc = normalizePath(path.relative(process.cwd(), path.resolve(root, 'src/sw.js')))
    const swDest = normalizePath(path.relative(process.cwd(), 'sw.js'))

    await fs.writeFile(
      path.resolve(root, 'external-pwa.config.mjs'),
      `export default {
  buildSW: {
    swSrc: '${swSrc}',
    swDest: '${swDest}',
    globPatterns: ['**/*.js'],
    injectionPoint: 'globalThis.__WB_MANIFEST',
    inlineWorkboxRuntime: false,
    sourcemap: true,
    minify: false,
    mode: 'production',
    manifest: true,
    logLevel: 'silent',
    bundlerLogLevel: { rolldown: 'silent' }
  }
}
`,
      'utf-8',
    )

    const stats = await runWebpack({
      mode: 'development',
      context: root,
      devtool: false,
      entry: './src/index.js',
      output: { filename: 'main.js', path: dist },
      plugins: [
        new WebpackWorkboxPlugin('build-sw', {
          cwd: root,
          path: 'external-pwa.config.mjs',
        }),
      ],
    })
    expect(stats.toJson({ errors: true }).errors).toEqual([])

    await expect(fs.readFile(path.resolve(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
  })
})
