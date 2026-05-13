import type { BuildSWResult, GenerateSWDependenciesResult } from './detector-types'
import semver from 'semver'

export async function detectRolldown(): Promise<boolean | undefined> {
  try {
    const r = await import('rolldown/config')
    if (!r || !('VERSION' in r)) {
      return false
    }
    return semver.major(r.VERSION) >= 1
  }
  catch {
    return undefined
  }
}

export async function detectMagicast(): Promise<boolean | undefined> {
  try {
    const m = await import('node:module').then(({ createRequire }) => {
      return createRequire(import.meta.url)('magicast/package.json')
    })
    if (!m || !('version' in m)) {
      return false
    }
    return semver.gte(m.version, '0.5.0')
  }
  catch {
    return undefined
  }
}

export async function detectVite(): Promise<boolean | undefined> {
  try {
    const v = await import('vite')
    if (!v || !('version' in v) || !('rolldownVersion' in v)) {
      return false
    }
    return semver.major(v.version) >= 8
  }
  catch {
    return undefined
  }
}

/**
 * We use `loadEnv` from Vite.
 *
 * This feature was added at Vite v5.4.11 by Anthony Fu, but not being exported yet:
 * [fix(cjs): build cjs for `loadEnv` #8305](https://github.com/vitejs/vite/issues/8305)
 *
 * Vite `loadEnv` was exported at v7.0.0-beta.0 by sapphi-red, we use v7.0.0:
 * [refactor: merge `src/node/publicUtils.ts` to `src/node/index.ts` #20086](https://github.com/vitejs/vite/pull/20086)
 *
 * @see https://github.com/vitejs/vite/blob/v5.4.11/packages/vite/CHANGELOG.md
 * @see https://github.com/vitejs/vite/blob/v7.0.0/packages/vite/CHANGELOG.md
 */
export async function detectViteLoadEnvSupport(): Promise<boolean> {
  try {
    const v = await import('vite')
    if (!v || !('version' in v)) {
      return false
    }
    return semver.gte(v.version, '7.0.0')
  }
  catch {
    return false
  }
}

export async function detectRolldownAndVite(): Promise<BuildSWResult> {
  const [rolldown, vite] = await Promise.allSettled([
    detectRolldown(),
    detectVite(),
  ])

  return {
    rolldown: rolldown.status === 'fulfilled' ? rolldown.value : undefined,
    vite: vite.status === 'fulfilled' ? vite.value : undefined,
  }
}

export async function detectGenerateSWDependencies(): Promise<GenerateSWDependenciesResult> {
  const [rolldown, magicast, vite] = await Promise.allSettled([
    detectRolldown(),
    detectMagicast(),
    detectVite(),
  ])

  return {
    rolldown: rolldown.status === 'fulfilled' ? rolldown.value : undefined,
    magicast: magicast.status === 'fulfilled' ? magicast.value : undefined,
    vite: vite.status === 'fulfilled' ? vite.value : undefined,
  }
}
