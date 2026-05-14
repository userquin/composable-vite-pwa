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
  DetectionData,
  DetectorMode,
  LoadDetectorReturn,
  OriginalEnvironmentData,
  ResolvedSWTargets,
} from './bundler-types'
import path from 'node:path'
import MagicString from 'magic-string'

export const workboxRegex = [
  /^@composable-vite-pwa\/workbox-swkit\//,
  /[\\/]workbox[\\/]swkit/,
]

export const BundlerNames: Record<Bundler, string> = {
  vite: 'Vite',
  rolldown: 'Rolldown',
}

export function normalizePath(path: string): string {
  return path.replace(/\\/g, '/')
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

export async function loadDetector<M extends DetectorMode>({
  mode,
  bundler: _,
  throwError = false,
}: {
  mode: M
  bundler: Bundler
  throwError?: boolean
  isDev?: boolean
}): Promise<LoadDetectorReturn<M>> {
  const [detector, log] = await Promise.all([
    import('./detector'),
    import('./log'),
  ])
  let message: string | undefined
  let detection: DetectionData<M>
  if (mode === 'generate-sw') {
    detection = await detector.detectGenerateSWDependencies()
    message = log.checkGenerateSWDependencies(detection, true)
  }
  else {
    detection = await detector.detectRolldownAndVite()
    // todo: ver que hacemos aquí
  }
  if (message) {
    if (throwError) {
      throw new Error(message)
    }
    console.warn(message)
  }

  return { detection, warned: !!message } as LoadDetectorReturn<M>
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

const varRegex = /\b(?:const|let)(?=\s+[_$a-zA-Z])/g

/**
 * GLOBAL TRANSFORMATION: ES6 to Classic (let/const to var).
 *
 * Since Rolldown/Vite only supports ES2015+ targets, we must manually
 * transform variable declarations for classic Service Workers to avoid
 * syntax errors on re-evaluation (Redeclaration Error).
 */
function replaceLetConstWithVar(magicString: MagicString) {
  let varMatch
  const currentCode = magicString.original

  // eslint-disable-next-line no-cond-assign
  while ((varMatch = varRegex.exec(currentCode)) !== null) {
    const start = varMatch.index
    const end = start + varMatch[0].length
    // Overwrite keeping the source map positions intact
    magicString.overwrite(start, end, 'var')
  }
}

export async function transformClassicChunk(
  name: 'workbox' | 'sw',
  code: string,
  generateSW: boolean,
  region: ClassicRegionReplacement,
  workboxFileName?: string,
) {
  let magicString: MagicString | undefined
  if (name === 'workbox') {
    magicString = new MagicString(code)

    // 1. wrap content, beware: search for sourcemap to keep it outside the iife wrapper
    const mapRegex = /\/\/# sourceMappingURL=.*/
    const mapMatch = code.match(mapRegex)
    let codeWithoutMap = code

    if (mapMatch) {
      codeWithoutMap = code.replace(mapRegex, '')
      magicString.remove(mapMatch.index!, code.length)
    }

    magicString.prepend('(function() {\n')

    const exportRegex = /export\s*\{([^}]+)\};?/g
    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = exportRegex.exec(codeWithoutMap)) !== null) {
      const [fullMatch, content] = match
      const members = content.split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim()).join(', ')

      // replace the export with the assigment
      const replacement = `\nself.workbox = self.workbox || {};\nself.workbox.swkit = { ${members} };`
      magicString.overwrite(match.index, match.index + fullMatch.length, replacement)
    }

    magicString.append('\n})();')

    // 2. there is a sourcemap, add it back outside the IIFE scope
    if (mapMatch) {
      magicString.append(`\n${mapMatch[0]}`)
    }
  }

  // --- CASE 2: service worker (imports cleanup) ---
  if (name === 'sw') {
    if (!workboxFileName) {
      // todo: add it to log.ts
      throw new Error('Missing workbox file name!')
    }
    // todo: allow add custom chunks mapping, this will work only with workbox runtime
    // for example, check this repo: https://github.com/userquin/nostroid/blob/master/src/custom-sw.ts#L8
    magicString = new MagicString(code)
    magicString.prepend(`importScripts("./${workboxFileName}");\n`)

    const importRegex = new RegExp(
      `import\\s+\\{([^}]+)\\}\\s+from\\s+['"]\\.\\/${workboxFileName}['"]`,
      'g',
    )

    let match
    // eslint-disable-next-line no-cond-assign
    while ((match = importRegex.exec(code)) !== null) {
      const [fullMatch, imports] = match

      const cleanImports = imports.split(',').map((i) => {
        const parts = i.trim().split(/\s+as\s+/)
        return parts.length > 1 ? parts[1].trim() : parts[0].trim()
      }).join(', ')

      const replacement = `var { ${cleanImports} } = self.workbox.swkit`
      magicString.overwrite(match.index, match.index + fullMatch.length, replacement)
    }
    // replace const/let with var: rolldown only supports ES6
    replaceLetConstWithVar(magicString)
    // replace regions with temp SW name
    if (generateSW) {
      restoreClassicGenerateSWRegions(region, magicString)
    }
  }

  return { ms: magicString }
}

export function resolveSWNamesAndGlobIgnores(
  options: GlobPartial & RequiredSWDestPartial,
  swSrc: string,
  generateSW: boolean,
) {
  const newSWSrc = generateSW ? options.swDest.replace(/\.js$/, '-temp.js') : swSrc
  const swChunkName = generateSW
    ? path.basename(newSWSrc, '.js')
    : path.basename(swSrc.replace(/\.([mc])?[jt]sx?$/, '.js'), '.js')
  const swDestBasename = path.basename(options.swDest)
  const classicSWDest = options.swDest.replace(swDestBasename, `classic-${swDestBasename}`)
  const moduleSWDest = options.swDest.replace(swDestBasename, `module-${swDestBasename}`)

  const classicSWSrc = generateSW ? newSWSrc.replace(/-temp\.js$/, '-classic-temp.js') : undefined
  const classicSWChunkName = classicSWSrc ? path.basename(classicSWSrc, '.js') : undefined
  const moduleSWSrc = generateSW ? newSWSrc.replace(/-temp\.js$/, '-module-temp.js') : undefined
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
