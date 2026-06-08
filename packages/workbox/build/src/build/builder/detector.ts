import type { BuildSWResult, DetectorOptions, DetectorResult, GenerateSWDependenciesResult } from './detector-types'
import { readFileSync } from 'node:fs'
import { findPackageJSON } from 'node:module'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import semver from 'semver'

const base = pathToFileURL(`${process.cwd()}/`).href

type Specifier = 'magicast' | 'vite' | 'rolldown'
function readPkgVersion(specifier: Specifier): string | undefined {
  const p = findPackageJSON(specifier, base)
  if (!p) {
    return undefined
  }

  const pkg = JSON.parse(readFileSync(p, 'utf8')) as { version?: unknown }
  if (pkg === undefined) {
    return undefined
  }
  return typeof pkg.version === 'string' ? pkg.version : undefined
}

export async function detectRolldown(): Promise<boolean | undefined> {
  try {
    const version = readPkgVersion('rolldown')
    if (!version) {
      return false
    }
    return semver.major(version) >= 1
  }
  catch { return undefined }
}

export async function detectMagicast(): Promise<boolean | undefined> {
  try {
    const version = readPkgVersion('magicast')
    if (!version) {
      return false
    }
    return semver.gte(version, '0.5.0')
  }
  catch { return undefined }
}

export async function detectVite(): Promise<boolean | undefined> {
  try {
    const version = readPkgVersion('vite')
    if (!version) {
      return false
    }
    return semver.major(version) >= 8
  }
  catch { return undefined }
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
