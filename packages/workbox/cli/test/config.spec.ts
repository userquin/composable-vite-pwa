import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG_FILES, loadCliConfiguration, resolveDefaultConfig } from '../src/config'

const fixtures = fileURLToPath(new URL('./fixtures', import.meta.url))

describe('resolveDefaultConfig', () => {
  it('lists every workbox.config.[cm]?[tj]s variant in precedence order', () => {
    expect([...DEFAULT_CONFIG_FILES]).toEqual([
      'workbox.config.js',
      'workbox.config.mjs',
      'workbox.config.cjs',
      'workbox.config.ts',
      'workbox.config.mts',
      'workbox.config.cts',
    ])
  })

  it('returns the highest-precedence file when several exist', () => {
    const dir = path.join(fixtures, 'discover-multi')
    expect(resolveDefaultConfig(dir)).toBe(path.join(dir, 'workbox.config.js'))
  })

  it('scans past missing higher-precedence names', () => {
    const dir = path.join(fixtures, 'discover-cjs')
    expect(resolveDefaultConfig(dir)).toBe(path.join(dir, 'workbox.config.cjs'))
  })

  it('returns undefined when no default config exists', () => {
    expect(resolveDefaultConfig(path.join(fixtures, 'discover-none'))).toBeUndefined()
  })

  it('defaults to the current working directory (which has no config here)', () => {
    expect(resolveDefaultConfig()).toBeUndefined()
  })
})

describe('loadCliConfiguration', () => {
  it('loads an explicit config path and surfaces CLI-only strategies', async () => {
    const config = await loadCliConfiguration(
      path.join(fixtures, 'load', 'workbox.config.mjs'),
    )
    expect(config.strategy).toBe('get-manifest')
    expect(config.getManifest?.globDirectory).toBe('public')
  })

  it('returns an empty config when neither a path nor a default file is found', async () => {
    const config = await loadCliConfiguration()
    expect(config.strategy).toBeUndefined()
  })
})
