import type { Configuration, Stats } from 'webpack'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { getDevMiddlewares, WebpackPWA } from '@composable-vite-pwa/unplugin-pwa/webpack'
import { afterEach, describe, expect, it } from 'vitest'
import webpack from 'webpack'

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => fs.rm(folder, { recursive: true, force: true })))
})

describe('webpack PWA', () => {
  it('generates a service worker and web manifest', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unplugin-pwa-webpack-'))
    folders.push(root)
    await fs.writeFile(path.join(root, 'index.js'), 'console.log("webpack pwa")')

    const output = path.join(root, 'dist')
    const stats = await compile({
      mode: 'production',
      context: root,
      entry: './index.js',
      output: { path: output, filename: 'main.js' },
      plugins: [WebpackPWA({
        strategies: 'generateSW',
        injectRegister: null,
        manifest: { name: 'Webpack PWA', short_name: 'PWA' },
      })],
    })

    expect(stats.hasErrors()).toBe(false)
    await expect(fs.stat(path.join(output, 'sw.js'))).resolves.toBeDefined()
    const manifest = await fs.readFile(path.join(output, 'manifest.webmanifest'), 'utf8')
    expect(manifest).toContain('Webpack PWA')
  })

  it.each([
    ['buildSW', 'buildSW'],
    ['injectManifest', 'injectManifest'],
  ] as const)('supports the %s strategy', async (strategy, option) => {
    const root = await createProject()
    const swSrc = path.join(root, 'custom-sw.js')
    await fs.writeFile(swSrc, `self.addEventListener('install', () => self.skipWaiting())\nself.__WB_MANIFEST\n`)

    const output = path.join(root, 'dist')
    const stats = await compile(createConfig(root, output, {
      strategies: strategy,
      [option]: { swSrc },
    }))

    expect(stats.toString({ all: false, errors: true })).toBe('')
    const sw = await fs.readFile(path.join(output, 'sw.js'), 'utf8')
    expect(sw).toContain('skipWaiting')
    expect(sw).not.toContain('self.__WB_MANIFEST')
  })

  it('supports the selfDestroySW strategy', async () => {
    const root = await createProject()
    const output = path.join(root, 'dist')
    const stats = await compile(createConfig(root, output, {
      strategies: 'selfDestroySW',
      selfDestroying: { swDest: 'sw.js' },
    }))

    expect(stats.toString({ all: false, errors: true })).toBe('')
    const sw = await fs.readFile(path.join(output, 'sw.js'), 'utf8')
    expect(sw).toContain('unregister')
  })

  it('resolves registration, info, and asset virtual modules', async () => {
    const root = await createProject(`
import { registerSW } from 'virtual:pwa-register'
import { pwaInfo } from 'virtual:pwa-info'
import { pwaAssetsHead } from 'virtual:pwa-assets/head'
import { pwaAssetsIcons } from 'virtual:pwa-assets/icons'
console.log(registerSW, pwaInfo, pwaAssetsHead, pwaAssetsIcons)
`)
    const output = path.join(root, 'dist')
    const stats = await compile(createConfig(root, output, {
      injectRegister: 'auto',
      manifest: { name: 'Virtual PWA', short_name: 'Virtual' },
    }))

    expect(stats.toString({ all: false, errors: true })).toBe('')
    const bundle = await fs.readFile(path.join(output, 'main.js'), 'utf8')
    expect(bundle).toContain('pwaInDevEnvironment')
    await expect(fs.stat(path.join(output, 'registerSW.js'))).rejects.toThrow()
  })

  it('emits the Webpack HMR registration module in development', async () => {
    const root = await createProject(`
import { registerDevSW } from 'virtual:pwa-entry-point-loaded'
registerDevSW()
`)
    const output = path.join(root, 'dist')
    const config = createConfig(root, output, {
      devOptions: { enabled: true },
    })
    config.mode = 'development'

    const stats = await compile(config)

    expect(stats.toString({ all: false, errors: true })).toBe('')
    const bundle = await fs.readFile(path.join(output, 'main.js'), 'utf8')
    expect(bundle).toContain('Unable to register the development service worker')
    expect(bundle).toContain('webpackHot')
  })

  it('serves development PWA assets through middleware', async () => {
    const root = await createProject()
    const output = path.join(root, 'dist')
    const pwa = WebpackPWA({
      devOptions: { enabled: true },
      injectRegister: 'script',
      manifest: { name: 'Development PWA', short_name: 'Dev' },
    })
    const stats = await compile({
      mode: 'development',
      context: root,
      entry: './index.js',
      output: { path: output, filename: 'main.js' },
      plugins: [pwa],
    })
    expect(stats.toString({ all: false, errors: true })).toBe('')

    const middlewares = getDevMiddlewares(pwa.api)
    const manifest = await request(middlewares, '/manifest.webmanifest')
    const register = await request(middlewares, '/registerSW.js')
    const workerUrl = [...pwa.api.dev.options.swAssetsPaths.keys()]
      .find(url => url.endsWith('.js') && !url.endsWith('suppress-warnings.js'))
    expect(workerUrl).toBeDefined()
    const worker = await request(middlewares, workerUrl!)

    expect(manifest.body).toContain('Development PWA')
    expect(manifest.contentType).toBe('application/manifest+json')
    expect(register.body).toContain('serviceWorker.register')
    expect(worker.body.length).toBeGreaterThan(0)
  })
})

async function request(
  middlewares: ReturnType<typeof getDevMiddlewares>,
  url: string,
): Promise<{ body: string, contentType?: string }> {
  const response: { body: string, contentType?: string } = { body: '' }
  const dispatch = async (index: number): Promise<void> => {
    const middleware = middlewares[index]
    if (!middleware)
      return
    let nextPromise: Promise<void> | undefined
    await middleware(
      { url },
      {
        setHeader(name, value) {
          if (name === 'Content-Type')
            response.contentType = value
        },
        end(body) {
          response.body = body?.toString() ?? ''
        },
      },
      () => {
        nextPromise = dispatch(index + 1)
      },
    )
    await nextPromise
  }
  await dispatch(0)
  return response
}

async function createProject(source = 'console.log("webpack pwa")'): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unplugin-pwa-webpack-'))
  folders.push(root)
  await fs.writeFile(path.join(root, 'index.js'), source)
  return root
}

function createConfig(root: string, output: string, options: Record<string, unknown>): Configuration {
  return {
    mode: 'production',
    context: root,
    entry: './index.js',
    output: { path: output, filename: 'main.js' },
    plugins: [WebpackPWA({
      injectRegister: null,
      manifest: false,
      ...options,
    } as any)],
  }
}

function compile(config: Configuration): Promise<Stats> {
  const compiler = webpack(config)
  return new Promise((resolve, reject) => {
    compiler.run((error, stats) => {
      compiler.close(() => {})
      if (error)
        reject(error)
      else if (!stats)
        reject(new Error('Webpack returned no stats'))
      else
        resolve(stats)
    })
  })
}
