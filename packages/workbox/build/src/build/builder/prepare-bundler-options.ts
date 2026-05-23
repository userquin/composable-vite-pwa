import type {
  BundlerOptions,
  PrepareBundlerOptions,
} from './bundler-types'
import fsp from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

interface PrepareBundlerOptionsType {
  builds: BundlerOptions[]
  filePathsMap: Map<'classic' | 'module', string[]>
  tempFiles: string[]
  tempFileWrites: Promise<void>[]
  classicCircularDependencies: string[]
  moduleCircularDependencies: string[]
}

export function prepareBundlerOptions(
  options: PrepareBundlerOptions,
): PrepareBundlerOptionsType {
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
  const classicCircularDependencies: string[] = []
  const moduleCircularDependencies: string[] = []
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
      originalSWType: swType,
      swType: 'classic',
      generateSW: !!generateSW,
      originalEnvironmentData: options.originalEnvironmentData,
      circularDependencies: classicCircularDependencies,
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
      originalSWType: swType,
      swType: 'module',
      generateSW: !!generateSW,
      originalEnvironmentData: options.originalEnvironmentData,
      circularDependencies: moduleCircularDependencies,
    })
  }

  return {
    builds,
    filePathsMap,
    tempFiles,
    tempFileWrites,
    classicCircularDependencies,
    moduleCircularDependencies,
  }
}
