import type { PrepareBundlerOptions } from '../src/build/bundler/bundler-types'
import fsp from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { prepareBundlerOptions } from '../src/build/bundler/bundler-utils'
import { resolveSWNamesAndGlobIgnores, transformESMTargetToRolldown } from '../src/build/bundler/utils'

// Mock de fsp.writeFile
vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn(() => Promise.resolve()),
  },
  writeFile: vi.fn(() => Promise.resolve()),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('common bundler options are correctly generated', () => {
  describe('transformESMTargetToRolldown', () => {
    it('transformESMTargetToRolldown resolves correctly to chrome96 for Rolldown', () => {
      expect(transformESMTargetToRolldown(
        'module',
        'chrome96',
      )).toEqual('chrome96')
    })
    it('transformESMTargetToRolldown resolves correctly to esnext for Rolldown', () => {
      expect(transformESMTargetToRolldown(
        'module',
        'baseline-widely-available',
      )).toEqual('esnext')
    })
  })
  describe('resolveSWNamesAndGlobIgnores', () => {
    it('generateSW', () => {
      expect(resolveSWNamesAndGlobIgnores(
        { swDest: 'sw.js' },
        '',
        true,
      )).toEqual({
        classicSWChunkName: 'sw-classic-temp',
        classicSWDest: 'classic-sw.js',
        classicSWSrc: 'sw-classic-temp.js',
        moduleSWChunkName: 'sw-module-temp',
        moduleSWDest: 'module-sw.js',
        moduleSWSrc: 'sw-module-temp.js',
        swChunkName: 'sw-temp',
        swDest: 'sw.js',
        swSrc: 'sw-temp.js',
      })
    })
    it('default buildSW generates custom sw names', () => {
      expect(resolveSWNamesAndGlobIgnores(
        { swDest: 'sw.js' },
        'sw.js',
        false,
      )).toEqual({
        classicSWChunkName: undefined,
        classicSWDest: 'classic-sw.js',
        classicSWSrc: undefined,
        moduleSWChunkName: undefined,
        moduleSWDest: 'module-sw.js',
        moduleSWSrc: undefined,
        swChunkName: 'sw',
        swDest: 'sw.js',
        swSrc: 'sw.js',
      })
    })
    it('buildSW with custom sw dest generates custom sw names', () => {
      expect(resolveSWNamesAndGlobIgnores({
        swDest: 'custom-sw.js',
      }, 'sw.js', false)).toEqual({
        classicSWChunkName: undefined,
        classicSWDest: 'classic-custom-sw.js',
        classicSWSrc: undefined,
        moduleSWChunkName: undefined,
        moduleSWDest: 'module-custom-sw.js',
        moduleSWSrc: undefined,
        swChunkName: 'sw',
        swDest: 'custom-sw.js',
        swSrc: 'sw.js',
      })
    })
  })
  describe('prepareBundlerOptions', () => {
    it('classic-and-module generates 2 bundler options for generateSW', async () => {
      const {
        classicSWSrc,
        classicSWChunkName,
        moduleSWSrc,
        moduleSWChunkName,
        swDest,
        classicSWDest,
        moduleSWDest,
      } = resolveSWNamesAndGlobIgnores(
        { swDest: 'sw.js' },
        '',
        true,
      )
      const options = {
        mode: 'production',
        swType: 'classic-and-module',
        swSrc: '',
        swChunkName: '',
        swDest,
        classicSWDest,
        moduleSWDest,
        classicSWSrc: classicSWSrc!,
        classicSWChunkName: classicSWChunkName!,
        moduleSWSrc: moduleSWSrc!,
        moduleSWChunkName: moduleSWChunkName!,
        inlineWorkboxRuntime: false,
        minify: false,
        manifestEntries: [],
        target: { classic: 'es2015', module: 'esnext' },
        workboxRuntimeCompatible: false,
        generateSW: { swCode: 'console.log("sw")' },
      } satisfies PrepareBundlerOptions

      const {
        builds,
        tempFiles,
        tempFileWrites,
      } = prepareBundlerOptions(options)

      expect(tempFiles).toHaveLength(2)
      expect(tempFileWrites).toHaveLength(2)
      await Promise.all(tempFileWrites)
      expect(fsp.writeFile).toHaveBeenCalledTimes(2)

      expect(builds).toHaveLength(2)
      expect(builds[0].inlineWorkboxRuntime !== true && builds[0].inlineWorkboxRuntime.workboxChunkName).toBe('workbox-classic')
      expect(builds[1].inlineWorkboxRuntime !== true && builds[1].inlineWorkboxRuntime.workboxChunkName).toBe('workbox-module')

      expect(tempFiles[0]).toMatch(/sw-classic-temp\.js$/)
      expect(tempFiles[1]).toMatch(/sw-module-temp\.js$/)
    })
    it('classic-and-module generates 2 bundler options for buildSW', async () => {
      const {
        swSrc,
        swChunkName,
        swDest,
        classicSWDest,
        moduleSWDest,
      } = resolveSWNamesAndGlobIgnores(
        { swDest: 'sw.js' },
        'sw.js',
        false,
      )
      const options = {
        mode: 'production',
        swType: 'classic-and-module',
        swSrc,
        swChunkName,
        swDest,
        classicSWDest,
        moduleSWDest,
        classicSWSrc: '',
        classicSWChunkName: '',
        moduleSWSrc: '',
        moduleSWChunkName: '',
        inlineWorkboxRuntime: false,
        minify: false,
        manifestEntries: [],
        target: { classic: 'es2015', module: 'esnext' },
        workboxRuntimeCompatible: false,
      } satisfies PrepareBundlerOptions

      const {
        builds,
        tempFiles,
        tempFileWrites,
      } = prepareBundlerOptions(options)

      expect(tempFiles).toHaveLength(0)
      expect(tempFileWrites).toHaveLength(0)

      expect(builds).toHaveLength(2)
      expect(builds[0].inlineWorkboxRuntime !== true && builds[0].inlineWorkboxRuntime.workboxChunkName).toBe('workbox-classic')
      expect(builds[1].inlineWorkboxRuntime !== true && builds[1].inlineWorkboxRuntime.workboxChunkName).toBe('workbox-module')
    })
  })
})
