import type MagicString from 'magic-string'
import type {
  GlobPartial,
  RequiredSWDestPartial,
  SWTarget,
  SWTargets,
  SWType,
} from '../../types'
import type {
  BuildGenerateSWOptions,
  BuildSWOptions,
} from '../types'
import type {
  Bundler,
  ClassicRegionReplacement,
  OriginalEnvironmentData,
  ResolvedSWTargets,
} from './bundler-types'
import path from 'node:path'

// hoist regexp
export const workboxRegex = [
  /^@composable-vite-pwa\/workbox-swkit\//,
  /[\\/]workbox[\\/]swkit/,
]
// DON'T hoist Regexp used with /g via exec/test/split
const normalizePathRegexp = /\\/g
const jsRegexp = /\.js$/
const tempRegexp = /-temp\.js$/
const anyJsRegexp = /\.([mc])?[jt]sx?$/
const camelizeRegexp = /-([a-z0-9])/g

export const BundlerNames: Record<Bundler, string> = {
  vite: 'Vite',
  rolldown: 'Rolldown',
}

export function normalizePath(path: string): string {
  return path.replace(normalizePathRegexp, '/')
}

export function extractOriginalEnvironmentData<
  T extends SWType,
  Options extends BuildSWOptions<T> | BuildGenerateSWOptions<T>,
>(
  options: Options,
  injectionPoint: string | false,
): OriginalEnvironmentData {
  return Object.assign({}, {
    mode: options.mode,
    baseDir: options.baseUrl,
    envDir: options.envDir,
    envPrefix: options.envPrefix,
    define: options.define,
    injectionPoint,
  }) as OriginalEnvironmentData
}

export function restoreClassicGenerateSWRegions(
  { search, replacement }: ClassicRegionReplacement,
  magicString: MagicString,
) {
  magicString.replace(
    `//#region ${search}`,
    `//#region ${replacement}`,
  )
}

export function camelize(str: string): string {
  return str.replace(camelizeRegexp, (_, char) => char.toUpperCase())
}

export function resolveSWNamesAndGlobIgnores(
  options: GlobPartial & RequiredSWDestPartial,
  swSrc: string,
  generateSW: boolean,
) {
  const newSWSrc = generateSW ? options.swDest.replace(jsRegexp, '-temp.js') : swSrc
  const swChunkName = generateSW
    ? path.basename(newSWSrc, '.js')
    : path.basename(swSrc.replace(anyJsRegexp, '.js'), '.js')
  const swDestBasename = path.basename(options.swDest)
  const classicSWDest = options.swDest.replace(swDestBasename, `${swChunkName}-classic.js`)
  const moduleSWDest = options.swDest.replace(swDestBasename, `${swChunkName}-module.js`)

  const classicSWSrc = generateSW ? newSWSrc.replace(tempRegexp, '-classic-temp.js') : undefined
  const classicSWChunkName = classicSWSrc ? path.basename(classicSWSrc, '.js') : undefined
  const moduleSWSrc = generateSW ? newSWSrc.replace(tempRegexp, '-module-temp.js') : undefined
  const moduleSWChunkName = moduleSWSrc ? path.basename(moduleSWSrc, '.js') : undefined

  options.globIgnores ??= []
  options.globIgnores.push(swSrc)
  options.globIgnores.push('**/*-classic-temp.js')
  options.globIgnores.push('**/*-module-temp.js')
  options.globIgnores.push(options.swDest)
  options.globIgnores.push(`${options.swDest}.map`)
  options.globIgnores.push(classicSWDest)
  options.globIgnores.push(`${classicSWDest}.map`)
  options.globIgnores.push(moduleSWDest)
  options.globIgnores.push(`${moduleSWDest}.map`)
  options.globIgnores.push('**/workbox-*.js')
  options.globIgnores.push('**/workbox-*.js.map')

  return {
    swSrc: newSWSrc,
    swChunkName,
    classicSWSrc,
    classicSWChunkName,
    moduleSWSrc,
    moduleSWChunkName,
    swDest: options.swDest,
    classicSWDest,
    moduleSWDest,
  }
}

export function prepareSWTargets(target: SWTarget): ResolvedSWTargets {
  return typeof target === 'string' || Array.isArray(target)
    ? {
        classic: target,
        module: target,
      }
    : target
}

export function transformESMTargetToRolldown(swType: SWType, target: SWTargets): SWTargets {
  return swType === 'module' && target === 'baseline-widely-available'
    ? 'esnext'
    : target
}

type AsyncFlatten<T extends unknown[]> = T extends (infer U)[]
  ? Exclude<Awaited<U>, U[]>[]
  : never

export async function asyncFlatten<T extends unknown[]>(
  arr: T,
): Promise<AsyncFlatten<T>> {
  do {
    arr = (await Promise.all(arr)).flat(Infinity) as any
  } while (arr.some((v: any) => v?.then))
  return arr as unknown[] as AsyncFlatten<T>
}
