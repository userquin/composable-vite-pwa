import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as rspack from '@rspack/core'
import { afterEach, describe, expect, it } from 'vitest'
import webpack from 'webpack'
import { WorkboxPlugin as RspackWorkboxPlugin } from '../src/build/rspack'
import { WorkboxPlugin as WebpackWorkboxPlugin } from '../src/build/webpack'

const tempRoots: string[] = []

async function createFixture(prefix: string) {
  const root = await fs.mkdtemp(path.join(process.cwd(), `${prefix}-pwa-`))
  tempRoots.push(root)
  const src = path.join(root, 'src')
  const dist = path.join(root, 'dist')

  await fs.mkdir(src)
  await fs.writeFile(
    path.join(src, 'index.js'),
    'document.body.textContent = "PWA compiler smoke"\n',
  )
  await fs.writeFile(
    path.join(src, 'sw.js'),
    [
      'import { clientsClaim } from "@composable-vite-pwa/workbox-swkit/core"',
      'import { precacheAndRoute } from "@composable-vite-pwa/workbox-swkit/precaching"',
      '',
      'globalThis.skipWaiting()',
      'clientsClaim()',
      'precacheAndRoute(globalThis.__WB_MANIFEST)',
      '',
    ].join('\n'),
  )

  return { dist, root }
}

afterEach(async () => {
  await Promise.allSettled(
    tempRoots.splice(0).map(root => fs.rm(root, { force: true, recursive: true })),
  )
})

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

function runRspack(config: rspack.Configuration): Promise<rspack.Stats> {
  return new Promise((resolve, reject) => {
    const compiler = rspack.rspack(config)
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

describe('webpack/rspack WorkboxPlugin', () => {
  it('runs build-sw with webpack compiler context and relative paths', async () => {
    const { dist, root } = await createFixture('webpack')
    const stats = await runWebpack({
      mode: 'development',
      context: root,
      devtool: false,
      entry: './src/index.js',
      output: {
        filename: 'main.js',
        path: dist,
      },
      plugins: [
        new WebpackWorkboxPlugin('build-sw', {
          buildSW: {
            options: {
              swSrc: 'src/sw.js',
              swDest: 'sw.js',
              globPatterns: ['**/*.js'],
              injectionPoint: 'globalThis.__WB_MANIFEST',
              inlineWorkboxRuntime: true,
              sourcemap: false,
              mode: 'development',
              logLevel: 'silent',
              bundlerLogLevel: { rolldown: 'silent' },
            },
          },
        }),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])
    await expect(fs.readFile(path.join(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
  })

  it('runs build-sw with rspack compiler context and relative paths', async () => {
    const { dist, root } = await createFixture('rspack')
    const stats = await runRspack({
      mode: 'development',
      context: root,
      devtool: false,
      entry: './src/index.js',
      output: {
        filename: 'main.js',
        path: dist,
      },
      plugins: [
        new RspackWorkboxPlugin('build-sw', {
          buildSW: {
            options: {
              swSrc: 'src/sw.js',
              swDest: 'sw.js',
              globPatterns: ['**/*.js'],
              injectionPoint: 'globalThis.__WB_MANIFEST',
              inlineWorkboxRuntime: true,
              sourcemap: false,
              mode: 'development',
              logLevel: 'silent',
              bundlerLogLevel: { rolldown: 'silent' },
            },
          },
        }),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])
    await expect(fs.readFile(path.join(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
  })

  it('loads external config files for webpack builds', async () => {
    const { dist, root } = await createFixture('webpack-config')
    await fs.writeFile(
      path.join(root, 'workbox.config.mjs'),
      [
        'export default {',
        '  buildSW: {',
        '    options: {',
        '      swSrc: "src/sw.js",',
        '      swDest: "sw.js",',
        '      globPatterns: ["**/*.js"],',
        '      injectionPoint: "globalThis.__WB_MANIFEST",',
        '      inlineWorkboxRuntime: true,',
        '      sourcemap: false,',
        '      mode: "development",',
        '      logLevel: "silent",',
        '      bundlerLogLevel: { rolldown: "silent" },',
        '    },',
        '  },',
        '}',
        '',
      ].join('\n'),
    )

    const stats = await runWebpack({
      mode: 'development',
      context: root,
      devtool: false,
      entry: './src/index.js',
      output: {
        filename: 'main.js',
        path: dist,
      },
      plugins: [
        new WebpackWorkboxPlugin('build-sw', {
          cwd: root,
          path: 'workbox.config.mjs',
        }),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])
    await expect(fs.readFile(path.join(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
  })
})
