import type { BuildResult, GenerateSWOptions, SWType } from '../types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { deepMergeObject } from 'magicast/helpers'
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

function throwMissingRolldownError(error: unknown): never {
  throw new Error('Failed to load Rolldown. Please make sure to install it as a dev dependency or enable auto install peers in your package manager settings.', { cause: error })
}

async function buildAssets<T extends SWType>(
  options: GenerateSWOptions<T>,
): Promise<BuildResult> {
  const rolldown = await import('./rolldown-build').catch(e => throwMissingRolldownError(e))
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

  const define: import('rolldown').TransformOptions['define'] = {}
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
      rolldown!.buildClassicSW(
        rootDir,
        classic,
        classicTemp,
        inline,
        sourcemap,
        define,
        filePaths,
        false,
      ),
      // module
      rolldown!.buildModuleSW(
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
          ? fs.writeFile(
              path.resolve(
                rootDir,
                `workbox${options.classicWorkboxRuntimeCompatible ? '' : '-classic'}.js`,
              ),
              chunks.workbox,
              'utf8',
            )
          : undefined,
      ].filter(Boolean))
      await rolldown!.buildClassicSW(
        rootDir,
        sw,
        swTemp,
        inline,
        sourcemap,
        define,
        filePaths,
        options.classicWorkboxRuntimeCompatible === true,
      )
    }
    else {
      await fs.writeFile(path.resolve(rootDir, swTemp), chunks.swCode, 'utf8')
      await rolldown.buildModuleSW(
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
