import type { BuildResult, GenerateSWOptions, SWType } from '../types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import MagicString from 'magic-string'
import { deepMergeObject } from 'magicast/helpers'
import { build } from 'tsdown'
import { validateGenerateSW } from '../validation/validation-helper'
import { prepareSWCode } from './prepare-sw-code'

export async function buildGenerateSW<T extends SWType>(options: GenerateSWOptions<T>): Promise<BuildResult> {
  const optionsWithDefaults = await validateGenerateSW(options)

  deepMergeObject(options, optionsWithDefaults)

  return await buildAssets(options)
}

function prepareGlobIgnores(
  options: GenerateSWOptions<SWType>,
): {
  sw: string
  swTemp: string
  classic: string
  classicTemp: string
  esm: string
  esmTemp: string
} {
  const entry = options.swDest.replace('.js', '.temp.js')
  const parts = options.swDest.split('/')
  const fileName = parts.pop()!
  const p = parts.join('/')

  const classic = `${p ? `${p}/` : ''}classic-${fileName}`
  const classicTemp = `${p ? `${p}/` : ''}classic-${fileName.replace('.js', '.temp.js')}`
  const esm = `${p ? `${p}/` : ''}esm-${fileName}`
  const esmTemp = `${p ? `${p}/` : ''}esm-${fileName.replace('.js', '.temp.js')}`

  options.globIgnores ??= []
  options.globIgnores.push(options.swDest)
  options.globIgnores.push(classic)
  options.globIgnores.push(esm)
  options.globIgnores.push('**/workbox-*.js')
  // add temp sw
  options.globIgnores.push(entry)
  options.globIgnores.push(classicTemp)
  options.globIgnores.push(esmTemp)
  if (options.sourcemap) {
    options.globIgnores.push(`${options.swDest}.map`)
    options.globIgnores.push(`${classic}.map`)
    options.globIgnores.push(`${esm}.map`)
    options.globIgnores.push('**/workbox-*.js.map')
    // add temp sw map
    options.globIgnores.push(`${entry}.map`)
  }

  return {
    sw: options.swDest,
    swTemp: entry,
    classic,
    classicTemp,
    esm,
    esmTemp,
  }
}

async function fixSourceMaps(
  sourcemap: boolean,
  swName: string,
  swFile: string,
  classicWorkboxRuntimeCompatible: boolean,
  classicReplacementName?: string,
  workbox?: {
    tempName: string
    name: string
    file: string
  },
) {
  await Promise.all([
    fs.readFile(swFile, 'utf-8').then((code) => {
      const s = new MagicString(code)
      s.replace(
        `//#region ${swName.replace('.js', '.temp.js')}`,
        `//#region ${swName}`,
      )
      if (classicReplacementName) {
        s.replace(
          `importScripts("./workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}.js")`,
          `importScripts("./${classicReplacementName}")`,
        )
      }
      return fs.writeFile(swFile, s.toString(), 'utf-8')
    }),
    sourcemap
      ? fs.writeFile(
          swFile.replace('.js', '.js.map'),
          await fs.readFile(
            swFile.replace('.js', '.js.map'),
            'utf-8',
          ).then((code) => {
            return code.replace(
              `"${swName.replace('.js', '.temp.js')}"`,
              `"${swName}"`,
            )
          }),
          'utf-8',
        )
      : undefined,
    sourcemap && workbox
      ? fs.writeFile(
          workbox.file.replace('.js', '.js.map'),
          await fs.readFile(
            workbox.file.replace('.js', '.js.map'),
            'utf-8',
          ).then((code) => {
            return code.replace(
              `"${workbox.tempName}"`,
              `"${workbox.name}"`,
            )
          }),
          'utf-8',
        )
      : undefined,
  ].filter(Boolean))
}

async function buildClassicSW(
  rootDir: string,
  swName: string,
  tempSwName: string,
  inline: boolean,
  sourcemap: boolean,
  define: import('tsdown').InlineConfig['define'],
  workboxRegex: RegExp[],
  filePaths: string[],
  classicWorkboxRuntimeCompatible: boolean,
  workboxClassicFileForSourceMap?: string,
) {
  const workbox = path.resolve(rootDir, `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}.js`)
  let workboxClassicFile: string | undefined
  const tempSWFile = path.resolve(rootDir, tempSwName)
  await build({
    dts: false,
    clean: false,
    entry: inline ? tempSwName : `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}.js`,
    platform: 'browser',
    fromVite: false,
    format: 'iife',
    outDir: rootDir,
    define,
    sourcemap,
    outputOptions: {
      comments: {
        legal: true,
        jsdoc: false,
        annotation: false,
      },
      chunkFileNames: inline ? swName : `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}-[hash].js`,
      assetFileNames: '[name]-[hash].[ext]',
      entryFileNames: inline ? swName : `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}-[hash].js`,
      codeSplitting: false,
    },
    hooks: {
      'build:done': async ({ chunks }) => {
        for (const chunk of chunks) {
          filePaths.push(path.resolve(rootDir, chunk.fileName))
        }
        if (inline) {
          await fs.rm(tempSWFile, { force: true })
          return
        }
        await fs.rm(workbox, { force: true })
        workboxClassicFile = chunks.find(chunk => chunk.name === `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}`)?.fileName
      },
    },
  })

  if (workboxClassicFile) {
    await buildClassicSW(
      rootDir,
      swName,
      tempSwName,
      true,
      sourcemap,
      define,
      workboxRegex,
      filePaths,
      classicWorkboxRuntimeCompatible,
      workboxClassicFile,
    )
    return
  }

  if (!inline) {
    throw new Error('workbox-classic-<hash>.js assets not found!')
  }

  await fixSourceMaps(
    sourcemap,
    swName,
    path.resolve(rootDir, swName),
    classicWorkboxRuntimeCompatible,
    workboxClassicFileForSourceMap,
    !inline && sourcemap
      ? {
          tempName: 'workbox-classic.js',
          name: workboxClassicFileForSourceMap!,
          file: path.resolve(rootDir, workboxClassicFileForSourceMap!),
        }
      : undefined,
  )
}

async function buildESMSW(
  rootDir: string,
  swName: string,
  tempSwName: string,
  inline: boolean,
  sourcemap: boolean,
  define: import('tsdown').InlineConfig['define'],
  workboxRegex: RegExp[],
  filePaths: string[],
) {
  const swChunkName = tempSwName.replace('.js', '')
  const tempSWFile = path.resolve(rootDir, tempSwName)
  let workboxModuleFile: string | undefined
  await build({
    dts: false,
    clean: false,
    entry: tempSwName,
    platform: 'browser',
    fromVite: false,
    format: 'esm',
    outDir: rootDir,
    define,
    sourcemap,
    outputOptions: {
      comments: {
        legal: true,
        jsdoc: false,
        annotation: false,
      },
      chunkFileNames: (chunk) => {
        switch (chunk.name) {
          case 'workbox-module':
            return 'workbox-module-[hash].js'
          case swChunkName:
            return swName
          default:
            return '[name]-[hash].[ext]'
        }
      },
      assetFileNames: '[name]-[hash].[ext]',
      entryFileNames: (chunk) => {
        switch (chunk.name) {
          case 'workbox-module':
            return 'workbox-module-[hash].js'
          case swChunkName:
            return swName
          default:
            return '[name]-[hash].js'
        }
      },
      codeSplitting: inline
        ? false
        : {
            groups: [
              {
                minSize: 0,
                name: (moduleId) => {
                  return workboxRegex.some(r => r.test(moduleId)) ? 'workbox-module' : undefined
                },
              },
            ],
          },
    },
    hooks: {
      'build:done': async ({ chunks }) => {
        for (const chunk of chunks) {
          filePaths.push(path.resolve(rootDir, chunk.fileName))
        }
        await fs.rm(tempSWFile, { force: true })
        if (!inline) {
          workboxModuleFile = chunks.find(chunk => chunk.name === 'workbox-module')?.fileName
        }
      },
    },
  })

  await fixSourceMaps(
    sourcemap,
    swName,
    path.resolve(rootDir, swName),
    false,
    undefined,
    !inline && sourcemap
      ? {
          tempName: 'workbox-module.js',
          name: workboxModuleFile!,
          file: path.resolve(rootDir, workboxModuleFile!),
        }
      : undefined,
  )
}

async function buildAssets<T extends SWType>(options: GenerateSWOptions<T>): Promise<BuildResult> {
  const {
    sw,
    swTemp,
    classic,
    classicTemp,
    esm,
    esmTemp,
  } = prepareGlobIgnores(options)
  const rootDir = options.globDirectory ? path.resolve(process.cwd(), options.globDirectory) : process.cwd()
  const { manifestEntries, chunks } = await prepareSWCode(rootDir, options)
  const inline = options.inlineWorkboxRuntime === true
  const sourcemap = options.sourcemap === true
  const workboxRegex = [/^@composable-vite-pwa\/workbox-swkit\//, /[\\/]workbox-swkit[\\/]/, /[\\/]workbox[\\/]swkit/]
  const filePaths: string[] = []

  const define: import('tsdown').InlineConfig['define'] = {}
  if (options.mode) {
    define['process.env.NODE_ENV'] = JSON.stringify(options.mode)
  }
  if (options.disableDevLogs) {
    define.__WB_DISABLE_DEV_LOGS = 'true'
  }

  if ('classic' in chunks) {
    await Promise.all([
      fs.writeFile(path.resolve(rootDir, classicTemp), chunks.classic.swCode, 'utf8'),
      fs.writeFile(path.resolve(rootDir, esmTemp), chunks.module.swCode, 'utf8'),
      chunks.classic.workbox
        ? fs.writeFile(path.resolve(rootDir, 'workbox-classic.js'), chunks.classic.workbox, 'utf8')
        : undefined,
    ].filter(Boolean))
    await Promise.all([
      // classic
      buildClassicSW(
        rootDir,
        classic,
        classicTemp,
        inline,
        sourcemap,
        define,
        workboxRegex,
        filePaths,
        false,
      ),
      // module
      buildESMSW(
        rootDir,
        esm,
        esmTemp,
        inline,
        sourcemap,
        define,
        workboxRegex,
        filePaths,
      ),
    ])
  }
  else {
    if (options.swType === 'classic') {
      await Promise.all([
        fs.writeFile(path.resolve(rootDir, swTemp), chunks.swCode, 'utf8'),
        chunks.workbox
          ? fs.writeFile(path.resolve(rootDir, 'workbox-classic.js'), chunks.workbox, 'utf8')
          : undefined,
      ].filter(Boolean))
      await buildClassicSW(
        rootDir,
        sw,
        swTemp,
        inline,
        sourcemap,
        define,
        workboxRegex,
        filePaths,
        options.classicWorkboxRuntimeCompatible === true,
      )
    }
    else {
      await fs.writeFile(path.resolve(rootDir, swTemp), chunks.swCode, 'utf8')
      await buildESMSW(
        rootDir,
        sw,
        swTemp,
        inline,
        sourcemap,
        define,
        workboxRegex,
        filePaths,
      )
    }
  }

  const {
    count,
    size,
    warnings,
  } = manifestEntries

  return {
    count,
    filePaths: filePaths.sort(),
    size,
    warnings,
  }
}
