import type { BuildResult } from '../../types'
import type { BundlerOptions, PrepareBundlerOptions } from './bundler-types'
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
    await Promise.all(prepareBuilds(builds))
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
      swDest = swType === 'classic' ? swDest : classicSWDest
      const file = path.resolve(process.cwd(), classicSWSrc)
      tempFiles.push(file)
      tempFileWrites.push(fsp.writeFile(
        file,
        generateSW.swCode,
        'utf-8',
      ))
    }
    else {
      swDest = swType === 'classic' ? swDest : classicSWDest
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
      generateSW: true,
    })
  }
  if (swType === 'classic-and-module' || swType === 'module') {
    if (generateSW) {
      swSrc = moduleSWSrc
      swChunkName = moduleSWChunkName
      swDest = swType === 'module' ? swDest : moduleSWDest
      const file = path.resolve(process.cwd(), moduleSWSrc)
      tempFiles.push(file)
      tempFileWrites.push(fsp.writeFile(
        file,
        generateSW.swCode,
        'utf-8',
      ))
    }
    else {
      swDest = swType === 'module' ? swDest : moduleSWDest
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
      generateSW: true,
    })
  }

  return {
    builds,
    filePathsMap,
    tempFiles,
    tempFileWrites,
  }
}
