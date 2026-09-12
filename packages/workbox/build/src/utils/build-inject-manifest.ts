import type { BuildResult, InjectManifestOptions } from '../types'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { errors } from '../validation/errors'
import { validateInjectManifest } from '../validation/validation-helper'
import { escapeRegExp } from './escape-regexp'
import { generateManifestEntries } from './generate-manifest-entries'
import { logInjectManifestResult, throwInvalidInjectionPoint } from './log'
import { deepMergeObject, prepareInjectManifestGlobIgnores } from './utils'

export async function buildInjectManifest(
  buildStart: ReturnType<typeof performance.now>,
  options: InjectManifestOptions,
): Promise<BuildResult> {
  if (options.injectionPoint === false || options.injectionPoint === null) {
    throwInvalidInjectionPoint()
  }

  const optionsWithDefaults = await validateInjectManifest(
    options,
  )

  deepMergeObject(
    options,
    optionsWithDefaults,
  )

  let swCode: string
  try {
    swCode = await fsp.readFile(options.swSrc, 'utf8')
  }
  catch (error) {
    throw new Error(
      `${errors['invalid-sw-src']} ${
        error instanceof Error && error.message ? error.message : ''
      }`,
    )
  }

  // extract clean code without sourcemap if present
  const { code: cleanCode, mapComment } = extractSourceMap(swCode)

  prepareInjectManifestGlobIgnores(options, !!mapComment)

  options.globIgnores = options.globIgnores || []
  options.globIgnores.push(options.swSrc, options.swDest)

  const injectionPoint = options.injectionPoint || ''
  const globalRegexp = new RegExp(escapeRegExp(injectionPoint), 'g')
  const injectionResults = cleanCode.match(globalRegexp)

  if (!injectionResults) {
    if (path.resolve(options.swSrc) === path.resolve(options.swDest)) {
      throw new Error(`${errors['same-src-and-dest']} ${injectionPoint}`)
    }
    throw new Error(`${errors['injection-point-not-found']} ${injectionPoint}`)
  }

  if (injectionResults.length > 1) {
    throw new Error(`${errors['multiple-injection-points']} ${injectionPoint}`)
  }

  const rootDir = path.resolve(process.cwd(), options.globDirectory)
  const {
    count,
    size,
    warnings,
    manifestEntries,
  } = await generateManifestEntries(options, rootDir)

  const s = new MagicString(cleanCode)
  const index = cleanCode.indexOf(injectionPoint)
  const manifestString = JSON.stringify(manifestEntries)

  s.overwrite(index, index + injectionPoint.length, manifestString)

  const finalCode = s.toString()
  const destPath = path.resolve(process.cwd(), options.swDest)
  const filePaths: string[] = [destPath]

  let isInline = false
  let isExternal = false
  let isHidden = false

  if (mapComment) {
    isInline = mapComment.includes('data:application/json')
    isExternal = !isInline
  }
  else {
    try {
      await fsp.access(`${options.swSrc}.map`, fs.constants.F_OK)
      isHidden = true
    }
    catch {
      // missing map files
    }
  }

  const destDir = path.dirname(destPath)
  await fsp.mkdir(destDir, { recursive: true })

  if (isInline || isExternal || isHidden) {
    const map = s.generateMap({
      source: path.basename(options.swSrc),
      includeContent: true,
      hires: true,
    })

    if (isInline) {
      const inlineCode = `${finalCode}\n//# sourceMappingURL=${map.toUrl()}`
      await fsp.writeFile(destPath, inlineCode, 'utf-8')
    }
    else {
      const mapPath = `${destPath}.map`
      let outputCode = finalCode
      if (isExternal) {
        outputCode += `\n//# sourceMappingURL=${path.basename(mapPath)}`
      }
      await fsp.writeFile(mapPath, map.toString(), 'utf-8')
      await fsp.writeFile(destPath, outputCode, 'utf-8')
      filePaths.push(mapPath)
    }
  }
  else {
    await fsp.writeFile(destPath, finalCode, 'utf-8')
  }

  // Copy files referenced by importScripts() in the SW source
  const swSrcDir = path.dirname(path.resolve(process.cwd(), options.swSrc))
  const copiedImportScripts = await copyImportScriptsAssets(
    cleanCode,
    swSrcDir,
    destDir,
  )
  filePaths.push(...copiedImportScripts)

  logInjectManifestResult(
    { count, size, warnings, filePaths },
    performance.now() - buildStart,
    options.logLevel ?? 'info',
  )

  return {
    count,
    size,
    warnings,
    filePaths: filePaths.sort(),
  }
}

/* const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/
const workboxSourcemapRegex = new RegExp(
  `(?:`
  + `/\\*`
  + `(?:\\s*\n(?://)?)?${
    innerRegex.source
  }\\s*`
  + `\\*!/`
  + `|`
  + `//${
    innerRegex.source
  })`
  + `\\s*`,
) */

const innerRegex = /[#@] sourceMappingURL=([^\s'"]*)/
const workboxSourcemapRegex = new RegExp(
  `(?:/\\*(?:\\s*\n(?://)?)?${innerRegex.source}\\s*\\*/|//${innerRegex.source})\\s*$`,
  'gm',
)

function extractSourceMap(code: string): { code: string, mapComment?: string } {
  let mapComment: string | undefined

  const matches = code.match(workboxSourcemapRegex)
  if (matches) {
    mapComment = matches[matches.length - 1].trim()
  }

  const cleanCode = code.replace(workboxSourcemapRegex, '').trimEnd()

  return { code: cleanCode, mapComment }
}

/**
 * Matches importScripts() calls with string arguments.
 * Handles single and double quotes, multiple arguments.
 * Examples:
 *   importScripts('./chunk.js')
 *   importScripts("./a.js", "./b.js")
 *   importScripts('./chunk.js', './helper.js')
 */
const IMPORT_SCRIPTS_REGEX = /importScripts\s*\(\s*((?:['"][^'"]+['"]\s*(?:,\s*)?)+)\)/g
const IMPORT_SCRIPTS_ARG_REGEX = /['"]([^'"]+)['"]/g

/**
 * Parse importScripts() calls in SW source code and return
 * relative file paths (those starting with './' or '../').
 */
export function parseImportScriptsRelativePaths(code: string): string[] {
  const paths: string[] = []
  let match: RegExpExecArray | null
  // eslint-disable-next-line no-cond-assign
  while ((match = IMPORT_SCRIPTS_REGEX.exec(code)) !== null) {
    const argsStr = match[1]!
    let argMatch: RegExpExecArray | null
    IMPORT_SCRIPTS_ARG_REGEX.lastIndex = 0
    // eslint-disable-next-line no-cond-assign
    while ((argMatch = IMPORT_SCRIPTS_ARG_REGEX.exec(argsStr)) !== null) {
      const arg = argMatch[1]!
      if (arg.startsWith('./') || arg.startsWith('../')) {
        paths.push(arg)
      }
    }
  }

  return paths
}

/**
+ * Copy files referenced by importScripts() from the SW source
 * directory to the SW destination directory.
 */
export async function copyImportScriptsAssets(
  code: string,
  swSrcDir: string,
  swDestDir: string,
): Promise<string[]> {
  const relativePaths = parseImportScriptsRelativePaths(code)
  if (!relativePaths.length)
    return []
  const copied: string[] = []
  for (const relPath of relativePaths) {
    const srcFile = path.resolve(swSrcDir, relPath)
    const destFile = path.resolve(swDestDir, path.basename(relPath))

    try {
      await fsp.access(srcFile, fs.constants.F_OK)
    }
    catch {
      // Source file doesn't exist, skip silently
      continue
    }

    await fsp.mkdir(path.dirname(destFile), { recursive: true })
    await fsp.copyFile(srcFile, destFile)
    copied.push(destFile)
  }

  return copied
}
