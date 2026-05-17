import type { BuildResult } from '../../types'
import type {
  BundlerOptions,
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
    const buildsResult = await Promise.allSettled(prepareBuilds(builds))
    const errors: { swType: string, reason: any }[] = []

    for (let i = 0; i < buildsResult.length; i++) {
      const result = buildsResult[i]
      if (result.status === 'rejected') {
        errors.push({ swType: builds[i].swType, reason: result.reason })
      }
    }

    if (errors.length > 0) {
      const errorMessages = errors.map(({ swType, reason }) => {
        const pluginInfo = reason?.plugin ? `[plugin: ${pc.magenta(reason.plugin)}] ` : ''
        const fileInfo = reason?.id ? `\n  ${pc.dim('File:')} ${pc.cyan(reason.id)}` : ''
        const frameInfo = reason?.frame ? `\n\n${reason.frame}` : ''
        const stackInfo = reason?.stack && !reason.frame ? `\n\n${pc.dim(reason.stack)}` : ''

        return [
          `${pc.red(pc.bold('●'))} ${pc.red(`Service Worker (${pc.yellow(swType)}) build failed:`)} ${pluginInfo}${reason?.message || reason}`,
          fileInfo,
          frameInfo,
          stackInfo,
        ].filter(Boolean).join('')
      }).join('\n\n')

      throw new Error(`\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Compilation failed during dual Service Worker build:')}\n\n${errorMessages}\n`)
    }
  }
  finally {
    if (tempFiles.length > 0) {
      const cwd = process.cwd()
      await Promise.allSettled(
        tempFiles.map(file => retryRm(path.resolve(cwd, file))),
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
