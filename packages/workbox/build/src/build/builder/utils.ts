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
import process from 'node:process'

// hoist regexp
export const workboxRegex = [
  /^@composable-vite-pwa\/workbox-swkit\//,
  /[\\/]workbox[\\/]swkit/,
].filter(Boolean)

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
): OriginalEnvironmentData {
  const data = Object.assign({}, {
    mode: options.mode,
    baseDir: options.baseUrl,
    envDir: options.envDir,
    envPrefix: options.envPrefix,
    define: options.define,
  }) as OriginalEnvironmentData

  if ('injectionPoint' in options) {
    data.injectionPoint = typeof options.injectionPoint === 'string' && options.injectionPoint ? options.injectionPoint : false
  }

  return data
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

/**
 * This method resolves the names for the SW source and destination files, as well as the globIgnores to exclude the
 * relevant files from the precache manifest.
 * @param options The options.
 * @param swSrc The service worker source file path.
 * @param generateSW if using generateSW strategy (or buildSW)
 */
export function resolveSWNamesAndGlobIgnores(
  options: GlobPartial & RequiredSWDestPartial,
  swSrc: string,
  generateSW: boolean,
) {
  // generateSW: we need a temp sw to generate the content from the options
  // - swSrc requires a new temp file, we need to "compile" it for three-shaking/dce
  // - swDest must be the <swName>-classic.js or <swName>-module.js extracted from swDest when required
  // buildSW:
  // - swSrc is in the codebase
  // - we need to provide classic and module extracted from swDest when required

  // path normalization
  const rootSWDest = path.resolve(process.cwd(), options.swDest)
  const swDestChunkName = path.basename(rootSWDest, '.js')
  const destDist = normalizePath(path.relative(process.cwd(), path.dirname(rootSWDest)))

  const prefix = destDist && destDist !== '.' ? `${destDist}/` : ''

  let newSWSrc: string
  let swChunkName: string
  let classicSWSrc: string
  let classicSWChunkName: string
  let classicSWDest: string
  let moduleSWSrc: string
  let moduleSWChunkName: string
  let moduleSWDest: string

  // swChunkName comes from the swSrc: it is the chunk name at generateBundle hook
  // dest files are the filename from options.swDest

  if (generateSW) {
    newSWSrc = options.swDest.replace(jsRegexp, '-temp.js')
    swChunkName = path.basename(newSWSrc, '.js')
    classicSWSrc = `${prefix}${swChunkName}-classic.js`
    classicSWChunkName = `${swChunkName}-classic`
    classicSWDest = `${prefix}${swDestChunkName}-classic.js`
    moduleSWSrc = `${prefix}${swChunkName}-module.js`
    moduleSWChunkName = `${swChunkName}-module`
    moduleSWDest = `${prefix}${swDestChunkName}-module.js`
  }
  else {
    newSWSrc = swSrc
    swChunkName = path.basename(swSrc.replace(anyJsRegexp, '.js'), '.js')
    classicSWSrc = swSrc
    classicSWChunkName = swChunkName
    classicSWDest = `${prefix}${swDestChunkName}-classic.js`
    moduleSWSrc = swSrc
    moduleSWChunkName = swChunkName
    moduleSWDest = `${prefix}${swDestChunkName}-module.js`
  }

  options.globIgnores ??= []
  if (generateSW) {
    options.globIgnores.push(newSWSrc)
  }
  else {
    options.globIgnores.push(swSrc)
  }
  options.globIgnores.push(classicSWSrc)
  options.globIgnores.push(moduleSWSrc)
  options.globIgnores.push(options.swDest)
  options.globIgnores.push(`${options.swDest}.map`)
  options.globIgnores.push(classicSWDest)
  options.globIgnores.push(`${classicSWDest}.map`)
  options.globIgnores.push(moduleSWDest)
  options.globIgnores.push(`${moduleSWDest}.map`)
  options.globIgnores.push('**/workbox-*.js')
  options.globIgnores.push('**/workbox-*.js.map')
  options.globIgnores.push('**/.vite-pwa/sw-manifest*.json')

  return {
    swSrc: newSWSrc,
    swChunkName,
    swDest: options.swDest,
    classicSWSrc,
    classicSWChunkName,
    classicSWDest,
    moduleSWSrc,
    moduleSWChunkName,
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
