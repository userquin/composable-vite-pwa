import type { WorkboxCliConfig } from '../src/options'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the build package so strategy dispatch + reporting can be tested without
// running real (rolldown/swkit-backed) service-worker builds.
// build/generate are now mocked at their rolldown subpaths, while the other two stay at the root package
const build = vi.hoisted(() => ({
  generateSW: vi.fn(),
  buildSW: vi.fn(),
  injectManifest: vi.fn(),
  getManifest: vi.fn(),
}))

vi.mock('@composable-vite-pwa/workbox-build/build/rolldown/build-sw', () => ({ buildSW: build.buildSW }))
vi.mock('@composable-vite-pwa/workbox-build/build/rolldown/generate-sw', () => ({ generateSW: build.generateSW }))
vi.mock('@composable-vite-pwa/workbox-build', () => ({ injectManifest: build.injectManifest, getManifest: build.getManifest }))

const { runGenerateSW } = await import('../src/strategies/generate-sw')
const { runBuildSW } = await import('../src/strategies/build-sw')
const { runInjectManifest } = await import('../src/strategies/inject-manifest')
const { runGetManifest } = await import('../src/strategies/get-manifest')

const dir = mkdtempSync(path.join(tmpdir(), 'wbx-strat-'))
const swFile = path.join(dir, 'sw.js')
writeFileSync(swFile, '// generated sw')
const buildResult = { count: 2, size: 2048, warnings: [], filePaths: [swFile] }

let info: ReturnType<typeof vi.spyOn>
let warn: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  build.generateSW.mockResolvedValue(buildResult)
  build.buildSW.mockResolvedValue(buildResult)
  build.injectManifest.mockResolvedValue(buildResult)
  build.getManifest.mockResolvedValue({
    count: 1,
    size: 64,
    warnings: ['heads up'],
    manifestEntries: [{ url: '/a.css', revision: 'abc123' }],
  })
  info = vi.spyOn(console, 'info').mockImplementation(() => {})
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  info.mockRestore()
  warn.mockRestore()
})

afterAll(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('generate-sw', () => {
  it('dispatches to generateSW with the generateSW options', async () => {
    await runGenerateSW({ strategy: 'generate-sw', generateSW: { swDest: 'sw.js' } } as WorkboxCliConfig)
    expect(build.generateSW).toHaveBeenCalledWith({ swDest: 'sw.js' })
  })

  it('throws when required options are missing', async () => {
    await expect(runGenerateSW({ strategy: 'generate-sw' })).rejects.toThrow('swDest')
    expect(build.generateSW).not.toHaveBeenCalled()
  })
})

describe('build-sw', () => {
  it('dispatches to buildSW with the buildSW options', async () => {
    const buildSW = { swSrc: 'src.js', swDest: 'sw.js', globDirectory: '.' }
    await runBuildSW({ strategy: 'build-sw', buildSW } as WorkboxCliConfig)
    expect(build.buildSW).toHaveBeenCalledWith(buildSW)
  })

  it('throws when required options are missing', async () => {
    await expect(runBuildSW({ strategy: 'build-sw' })).rejects.toThrow('swSrc')
    expect(build.buildSW).not.toHaveBeenCalled()
  })
})

describe('inject-manifest', () => {
  it('dispatches to injectManifest with the injectManifest options and reports', async () => {
    const injectManifest = { swSrc: 'src.js', swDest: 'sw.js', globDirectory: '.' }
    await runInjectManifest({ strategy: 'inject-manifest', injectManifest } as WorkboxCliConfig)
    expect(build.injectManifest).toHaveBeenCalledWith(injectManifest)
    expect(info).toHaveBeenCalledWith(expect.stringContaining('inject-manifest'))
  })

  it('throws when required options are missing', async () => {
    await expect(runInjectManifest({ strategy: 'inject-manifest' })).rejects.toThrow('swSrc')
    expect(build.injectManifest).not.toHaveBeenCalled()
  })
})

describe('get-manifest', () => {
  it('dispatches to getManifest and prints the resolved manifest entries', async () => {
    await runGetManifest({ strategy: 'get-manifest', getManifest: { globDirectory: '.' } })
    expect(build.getManifest).toHaveBeenCalledWith({ globDirectory: '.' })
    expect(info).toHaveBeenCalledWith(expect.stringContaining('manifest entries'))
    expect(info).toHaveBeenCalledWith(expect.stringContaining('/a.css'))
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('heads up'))
  })

  it('throws when globDirectory is missing', async () => {
    await expect(runGetManifest({ strategy: 'get-manifest' })).rejects.toThrow('globDirectory')
    expect(build.getManifest).not.toHaveBeenCalled()
  })
})
