import fs from 'node:fs/promises'
import path from 'node:path'
import { describe, expect } from 'vitest'
import { injectManifest } from '../src/inject-manifest'
import { normalizePath } from '../src/utils/resolve-sw-names'
import { errors } from '../src/validation/errors'
import { testInjectManifest } from './test-helper'

describe('inject-manifest', () => {
  testInjectManifest('run inject-manifest (happy path)', async ({ sandbox }) => {
    const fixtureDir = sandbox
    const swSrc = normalizePath(path.resolve(fixtureDir, 'sw.js'))
    const swDest = normalizePath(path.resolve(fixtureDir, 'sw-test.js'))
    const globDirectory = normalizePath(fixtureDir)
    const result = await injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })

    const swContent = await fs.readFile(swDest, 'utf8')
    expect(swContent).toContain('index.js')
    expect(swContent).not.toContain('self.__WB_MANIFEST')
    expect(result.count).toBeGreaterThan(0)
  })

  testInjectManifest('injection-point-not-found', async ({ sandbox }) => {
    const swSrc = normalizePath(path.resolve(sandbox, 'no-point.js'))
    const swDest = normalizePath(path.resolve(sandbox, 'out.js'))
    const globDirectory = normalizePath(sandbox)

    await fs.writeFile(swSrc, 'self.addEventListener(\'install\', () => {})\n', 'utf-8')

    await expect(injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })).rejects.toThrow(errors['injection-point-not-found'])
  })

  testInjectManifest('multiple-injection-points', async ({ sandbox }) => {
    const swSrc = normalizePath(path.resolve(sandbox, 'sw.js'))
    const swDest = normalizePath(path.resolve(sandbox, 'out.js'))
    const globDirectory = normalizePath(sandbox)

    await fs.writeFile(swSrc, 'self.__WB_MANIFEST\nself.__WB_MANIFEST\n')

    await expect(injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })).rejects.toThrow(errors['multiple-injection-points'])
  })

  testInjectManifest('same-src-and-dest', async ({ sandbox }) => {
    const swSrc = normalizePath(path.resolve(sandbox, 'same.js'))
    const swDest = swSrc
    const globDirectory = normalizePath(sandbox)

    await fs.writeFile(swSrc, 'console.log(1)\n')

    await expect(injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })).rejects.toThrow(errors['same-src-and-dest'])
  })

  testInjectManifest('invalid-sw-src', async ({ sandbox }) => {
    const swDest = normalizePath(path.resolve(sandbox, 'same.js'))
    const globDirectory = normalizePath(sandbox)

    await expect(injectManifest({
      swSrc: 'non-existing-sw.js',
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })).rejects.toThrow(errors['invalid-sw-src'])
  })
  testInjectManifest('copies relative importScripts assets to dest directory', async ({ sandbox }) => {
    // Create a chunk file that the SW references via importScripts
    const chunkPath = path.resolve(sandbox, 'chunk.js')
    await fs.writeFile(chunkPath, 'self.addEventListener("fetch", () => {})', 'utf-8')

    // Create SW source with importScripts referencing the chunk
    const swSrc = normalizePath(path.resolve(sandbox, 'sw.js'))
    await fs.writeFile(swSrc, [
      'importScripts(\'./chunk.js\')',
      'self.__WB_MANIFEST',
    ].join('\n'), 'utf-8')

    const swDest = normalizePath(path.resolve(sandbox, 'dist', 'sw.js'))
    const globDirectory = normalizePath(sandbox)

    const result = await injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })

    // The chunk file should have been copied to the dest directory
    const destChunk = path.resolve(sandbox, 'dist', 'chunk.js')
    const chunkContent = await fs.readFile(destChunk, 'utf-8')
    expect(chunkContent).toContain('fetch')

    // The copied file should be included in filePaths
    expect(result.filePaths).toContain(normalizePath(destChunk))
  })

  testInjectManifest('skips missing importScripts assets without error', async ({ sandbox }) => {
    // SW references a chunk that doesn't exist on disk
    const swSrc = normalizePath(path.resolve(sandbox, 'sw.js'))
    await fs.writeFile(swSrc, [
      'importScripts(\'./missing-chunk.js\')',
      'self.__WB_MANIFEST',
    ].join('\n'), 'utf-8')

    const swDest = normalizePath(path.resolve(sandbox, 'dist', 'sw.js'))
    const globDirectory = normalizePath(sandbox)

    // Should not throw
    const result = await injectManifest({
      swSrc,
      swDest,
      globDirectory,
      globPatterns: ['**/*.js'],
      injectionPoint: 'self.__WB_MANIFEST',
      logLevel: 'silent',
    })

    expect(result.filePaths).not.toContain('missing-chunk.js')
  })
})
