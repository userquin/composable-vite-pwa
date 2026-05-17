import type { BuildResult } from '../../types'
import type {
  BundlerOptions,
} from './bundler-types'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

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
  prepareBuilds: (builds: BundlerOptions[]) => Promise<void>[],
  tempFiles: string[] = [],
): Promise<BuildResult> {
  try {
    if (tempFileWrites.length > 0) {
      await Promise.all(tempFileWrites)
    }
    if (builds.length > 1) {
      const buildsResult = await Promise.allSettled(prepareBuilds(builds))
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
      await Promise.all(prepareBuilds(builds))
    }
  }
  finally {
    if (tempFiles.length > 0) {
      await Promise.allSettled(
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
