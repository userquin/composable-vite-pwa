import type { BuildResult } from '../../types'
import type {
  Bundler,
  BundlerOptions,
  CircularDependenciesOptions,
  PrepareBundlerOptions,
  RolldownOptions,
} from './bundler-types'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import pc from 'picocolors'

async function retryRm(filePath: string, retries = 3, delay = 50) {
  for (let i = 0; i < retries; i++) {
    try {
      await fsp.access(filePath, fs.constants.R_OK)
      await fsp.rm(filePath, { force: true })
    }
    catch (err: any) {
      if (err.code === 'ENOENT') {
        return
      }

      if (i === retries - 1) {
        throw err
      }

      await new Promise(resolve => setTimeout(resolve, delay).unref())
    }
  }
}

export function prepareCircularDependencies<T extends Bundler>(
  options: RolldownOptions<T>,
): CircularDependenciesOptions<T> {
  return options.detectCircularDeps
    ? {
        checks: {
          circularDependency: true,
        },
        onLog: (level, log, defaultHandler) => {
          if (log.code === 'CIRCULAR_DEPENDENCY') {
            const message = log.message || 'Circular dependency detected.'
            console.warn([
              `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('Highly Experimental Warning:')}\n`,
              `  ${pc.yellow(message)}`,
              `  ${pc.yellow(pc.bold('Note:'))} Rolldown might attempt to flatten these modules, but due to the highly experimental nature`,
              `  of custom chunks, ${pc.yellow(pc.bold('YOU MUST REVIEW'))} the final asset outputs manually to verify everything is correct.`,
              `  ${pc.yellow(pc.bold('CRITICAL:'))} Always thoroughly test the generated service worker in a local or staging environment`,
              `  before deploying this build to production!\n`,
            ].join('\n'))
            return // Ignore/swallow the raw native circular dependency warning
          }
          if (level === 'warn') {
            defaultHandler('error', log) // turn other warnings into errors
          }
          else {
            defaultHandler(level, log) // otherwise, just print the log
          }
        },
      } as CircularDependenciesOptions<T>
    : {} as CircularDependenciesOptions<T>
}

/**
 * Dual Build Orchestration & Circular Dependency Safety:
 * 1. Process Stability: We use Promise.allSettled for dual builds (classic & module)
 * to ensure all bundler processes reach a stable completion. Rejecting immediately
 * could leave underlying Rust/Rolldown threads in an inconsistent state.
 * 2. Circular Dependency Enforcement: We always enable 'checks.circularDependency'
 * in Rolldown options. While modern bundlers are smart enough to resolve simple
 * cycles via inlining (as seen in single-chunk builds), circular dependencies
 * become a fatal execution error in 'classic' Service Workers once code-splitting
 * (customChunks) is involved. In those cases, 'importScripts' order issues will
 * trigger our custom error handling.
 * 3. Transformation Integrity: Entry point and Workbox chunk naming are strictly
 * controlled to ensure our post-build transformations (ES6 to ES5 var conversion
 * and IIFE wrapping) target the correct files deterministically.
 */
export async function runBundlerBuild(
  count: number,
  size: number,
  warnings: string[],
  builds: BundlerOptions[],
  filePathsMap: Map<'classic' | 'module', string[]>,
  tempFileWrites: Promise<void>[],
  prepareBuilds: () => Promise<void>[],
  tempFiles: string[] = [],
): Promise<BuildResult> {
  try {
    if (tempFileWrites.length > 0) {
      await Promise.all(tempFileWrites)
    }
    if (builds.length > 1) {
      const buildsResult = await Promise.allSettled(prepareBuilds())
      // todo: handle circular
      let result: PromiseSettledResult<any>
      for (let i = 0; i < buildsResult.length; i++) {
        result = buildsResult[i]
        if (result.status === 'rejected') {
          console.log(`SW ${builds[i].swType} build failed: ${result.reason?.message || result.reason}`)
        }
        else {
          console.log(`SW ${builds[i].swType} ok`)
        }
      }
    }
    else {
      await Promise.all(prepareBuilds())
    }
  }
  finally {
    if (tempFiles.length > 0) {
      await Promise.all(
        tempFiles.map(file => retryRm(path.resolve(process.cwd(), file))),
      )
    }
  }

  const filePaths: string[] = []
  for (const paths of filePathsMap.values()) {
    filePaths.push(...paths)
  }

  return {
    count,
    size,
    filePaths: filePaths.sort((a, b) => a.localeCompare(b)),
    warnings,
  }
}

export function prepareBundlerOptions(
  options: PrepareBundlerOptions,
): {
  builds: BundlerOptions[]
  filePathsMap: Map<'classic' | 'module', string[]>
  tempFiles: string[]
  tempFileWrites: Promise<void>[]
} {
  let {
    mode,
    swSrc,
    swChunkName,
    swDest,
    classicSWSrc,
    classicSWChunkName,
    classicSWDest,
    moduleSWSrc,
    moduleSWChunkName,
    moduleSWDest,
    target,
    inlineWorkboxRuntime,
    workboxRuntimeCompatible,
    minify,
    generateSW,
    manifestEntries,
  } = options
  const builds: BundlerOptions[] = []
  const filePathsMap = new Map<'classic' | 'module', string[]>([['classic', []], ['module', []]])
  const swType = options.swType!
  const tempFileWrites: Promise<void>[] = []
  const tempFiles: string[] = []
  if (swType === 'classic-and-module' || swType === 'classic') {
    if (generateSW) {
      swSrc = classicSWSrc
      swChunkName = classicSWChunkName
      swDest = swType === 'classic-and-module' || !workboxRuntimeCompatible ? classicSWDest : swDest
      const file = path.resolve(process.cwd(), classicSWSrc)
      tempFiles.push(file)
      tempFileWrites.push(fsp.writeFile(
        file,
        generateSW.swCode,
        'utf-8',
      ))
    }
    else {
      swDest = swType === 'classic-and-module' || !workboxRuntimeCompatible ? classicSWDest : swDest
    }
    builds.push({
      mode,
      manifestEntries,
      filePaths: filePathsMap.get('classic')!,
      swSrc,
      swChunkName,
      swDest,
      target: target.classic,
      minify,
      inlineWorkboxRuntime: inlineWorkboxRuntime
        ? true
        : {
            workboxChunkName: swType === 'classic-and-module' || !workboxRuntimeCompatible ? 'workbox-classic' : 'workbox',
          },
      workboxRuntimeCompatible: swType === 'classic' ? workboxRuntimeCompatible : false,
      swType: 'classic',
      generateSW: !!generateSW,
      originalEnvironmentData: options.originalEnvironmentData,
    })
  }
  if (swType === 'classic-and-module' || swType === 'module') {
    if (generateSW) {
      swSrc = moduleSWSrc
      swChunkName = moduleSWChunkName
      swDest = swType === 'classic-and-module' || !workboxRuntimeCompatible ? moduleSWDest : swDest
      const file = path.resolve(process.cwd(), moduleSWSrc)
      tempFiles.push(file)
      tempFileWrites.push(fsp.writeFile(
        file,
        generateSW.swCode,
        'utf-8',
      ))
    }
    else {
      swDest = swType === 'classic-and-module' || !workboxRuntimeCompatible ? moduleSWDest : swDest
    }
    builds.push({
      mode,
      manifestEntries,
      filePaths: filePathsMap.get('module')!,
      swSrc,
      swChunkName,
      swDest,
      target: target.module,
      minify,
      inlineWorkboxRuntime: inlineWorkboxRuntime
        ? true
        : {
            workboxChunkName: swType === 'classic-and-module' || !workboxRuntimeCompatible ? 'workbox-module' : 'workbox',
          },
      workboxRuntimeCompatible: swType === 'module' ? workboxRuntimeCompatible : false,
      swType: 'module',
      generateSW: !!generateSW,
      originalEnvironmentData: options.originalEnvironmentData,
    })
  }

  return {
    builds,
    filePathsMap,
    tempFiles,
    tempFileWrites,
  }
}
