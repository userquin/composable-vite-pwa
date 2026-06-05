import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as rspack from '@rspack/core'
import { it as base, describe, expect } from 'vitest'
import webpack from 'webpack'
import { normalizePath } from '../src/build/builder/utils'
import { WorkboxPlugin as RspackWorkboxPlugin } from '../src/build/rspack'
import { WorkboxPlugin as WebpackWorkboxPlugin } from '../src/build/webpack'

async function createFixture(prefix: string, use: (paths: { root: string, dist: string }) => Promise<void>) {
  let root: string | undefined
  try {
    root = await fs.mkdtemp(path.resolve(process.cwd(), 'test', 'temp-fixtures', `${prefix}-pwa-`))
    const src = path.resolve(root, 'src')
    const dist = path.resolve(root, 'dist')

    await fs.mkdir(src)
    await fs.writeFile(
      path.resolve(src, 'index.js'),
      'document.body.textContent = "PWA compiler smoke"\n',
    )
    await fs.writeFile(
      path.resolve(src, 'sw.js'),
      `import { clientsClaim } from "@composable-vite-pwa/workbox-swkit/core"
import { precacheAndRoute } from "@composable-vite-pwa/workbox-swkit/precaching"

globalThis.skipWaiting()
clientsClaim()
precacheAndRoute(globalThis.__WB_MANIFEST)
`,
      'utf-8',
    )
    if (prefix === 'rspack') {
      await fs.writeFile(
        path.resolve(root, 'package.json'),
        `{
  "name": "rsbuild-app",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@composable-vite-pwa/workbox-swkit": "workspace:*"
  },
  "devDependencies": {
    "@composable-vite-pwa/workbox-build": "workspace:*",
    "@rsbuild/core": "catalog:rsbuild"
  }
}
`,
        'utf-8',
      )
    }
    else {
      await fs.writeFile(
        path.resolve(root, 'package.json'),
        `{
  "name": "webpack-app",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@composable-vite-pwa/workbox-swkit": "workspace:*"
  },
  "devDependencies": {
    "@composable-vite-pwa/workbox-build": "workspace:*",
    "webpack": "catalog:webpack5"
  }
}
`,
      )
    }

    await use({
      root,
      dist,
    })
  }
  finally {
    if (root) {
      await fs.rm(root, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      }).catch((err) => {
        console.error(`Failed to cleanup sandbox at ${root}:`, err)
      })
    }
  }
}

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

const isWatchMode = process.env.VITEST_MODE === 'WATCH'

export const testWebpack = base.extend<{
  sandbox: {
    root: string
    dist: string
  }
}>({
  // eslint-disable-next-line no-empty-pattern
  sandbox: async ({}, use) => {
    await createFixture('webpack', use)
  },
}).skipIf(isWatchMode)

export const testRspack = base.extend<{
  sandbox: {
    root: string
    dist: string
  }
}>({
  // eslint-disable-next-line no-empty-pattern
  sandbox: async ({}, use) => {
    await createFixture('rspack', use)
  },
}).skipIf(isWatchMode)

describe('webpack/rspack WorkboxPlugin', () => {
  testWebpack('runs build-sw with webpack compiler context and relative paths', async ({ sandbox }) => {
    const { dist, root } = sandbox
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
        new WebpackWorkboxPlugin(
          'build-sw',
          {
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
          },
        ),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])

    const swFilePromise = fs.readFile(path.resolve(dist, 'sw.js'), 'utf8')
    await expect(swFilePromise).resolves.not.toThrow()
    const swContent = await swFilePromise
    expect(swContent).toContain('main.js')
  })

  testRspack('runs build-sw with rspack compiler context and relative paths', async ({ sandbox }) => {
    const { dist, root } = sandbox
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
        new RspackWorkboxPlugin(
          'build-sw',
          {
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
          },
        ),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])

    await expect(fs.readFile(path.resolve(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
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
      output: {
        filename: 'main.js',
        path: dist,
      },
      plugins: [
        new WebpackWorkboxPlugin(
          'build-sw',
          {
            cwd: root,
            path: 'external-pwa.config.mjs',
          },
        ),
      ],
    })

    expect(stats.toJson({ errors: true }).errors).toEqual([])

    await expect(fs.readFile(path.resolve(dist, 'sw.js'), 'utf8')).resolves.toContain('main.js')
  })
})
