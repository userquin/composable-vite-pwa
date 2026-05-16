import type { BuildSWResult, DetectorOptions, DetectorResult, GenerateSWDependenciesResult } from './detector-types'
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

export async function detect(options: DetectorOptions): Promise<DetectorResult> {
  const [
    vite,
    rolldown,
    magicast,
  ] = await Promise.allSettled([
    options.vite ? detectVite() : Promise.resolve(false),
    options.rolldown ? detectRolldown() : Promise.resolve(false),
    options.magicast ? detectMagicast() : Promise.resolve(false),
  ])

  return {
    vite: vite.status === 'fulfilled' ? vite.value === true : false,
    rolldown: rolldown.status === 'fulfilled' ? rolldown.value === true : false,
    magicast: magicast.status === 'fulfilled' ? magicast.value === true : false,
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

export async function detectBuildSWDependencies(): Promise<BuildSWResult> {
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
