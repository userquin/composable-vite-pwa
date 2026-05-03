import type { BuildResult, GenerateSWOptions, SWType } from '../types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { deepMergeObject } from 'magicast/helpers'
import { validateGenerateSW } from '../validation/validation-helper'
import { logDeprecatedGenerateSW } from './log'
import { prepareSWCode } from './prepare-sw-code'
import { buildClassicSW, buildModuleSW } from './rolldown-build'
import { prepareGlobIgnores } from './utils'

export async function buildGenerateSW<T extends SWType>(options: GenerateSWOptions<T>, legacy = false): Promise<BuildResult> {
  if (legacy) {
    logDeprecatedGenerateSW()
  }

  const optionsWithDefaults = await validateGenerateSW(options)

  deepMergeObject(options, optionsWithDefaults)

  return await buildAssets(options)
}

async function buildAssets<T extends SWType>(
  options: GenerateSWOptions<T>,
): Promise<BuildResult> {
  const {
    sw,
    swTemp,
    classic,
    classicTemp,
    esm,
    esmTemp,
  } = prepareGlobIgnores(options, options.sourcemap === true)
  const buildDir = path.dirname(path.resolve(process.cwd(), options.swDest))
  const { manifestEntries, chunks } = await prepareSWCode(
    options,
    options.globDirectory
      ? path.resolve(process.cwd(), options.globDirectory)
      : undefined,
  )
  const inline = options.inlineWorkboxRuntime === true
  const sourcemap = options.sourcemap ?? true
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
      fs.writeFile(path.resolve(buildDir, classicTemp), chunks.classic.swCode, 'utf8'),
      fs.writeFile(path.resolve(buildDir, esmTemp), chunks.module.swCode, 'utf8'),
      chunks.classic.workbox
        ? fs.writeFile(path.resolve(buildDir, 'workbox-classic.js'), chunks.classic.workbox, 'utf8')
        : undefined,
    ].filter(Boolean))
    await Promise.all([
      // classic
      buildClassicSW(
        buildDir,
        classic,
        classicTemp,
        inline,
        sourcemap,
        define,
        filePaths,
        false,
      ),
      // module
      buildModuleSW(
        buildDir,
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
        fs.writeFile(path.resolve(buildDir, swTemp), chunks.swCode, 'utf8'),
        chunks.workbox
          ? fs.writeFile(
              path.resolve(
                buildDir,
                `workbox${options.classicWorkboxRuntimeCompatible ? '' : '-classic'}.js`,
              ),
              chunks.workbox,
              'utf8',
            )
          : undefined,
      ].filter(Boolean))
      await buildClassicSW(
        buildDir,
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
      await fs.writeFile(path.resolve(buildDir, swTemp), chunks.swCode, 'utf8')
      await buildModuleSW(
        buildDir,
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
