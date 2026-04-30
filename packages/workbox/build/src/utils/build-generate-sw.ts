import type { BuildResult, GenerateSWOptions, SWType } from '../types'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { prepareGlobIgnores } from '@composable-vite-pwa/workbox-build/utils/utils'
import { deepMergeObject } from 'magicast/helpers'
import { validateGenerateSW } from '../validation/validation-helper'
import { prepareSWCode } from './prepare-sw-code'
import { buildClassicSW, buildModuleSW } from './rolldown-build'

export async function buildGenerateSW<T extends SWType>(options: GenerateSWOptions<T>): Promise<BuildResult> {
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
      buildClassicSW(
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
      buildModuleSW(
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
      await buildClassicSW(
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
      await buildModuleSW(
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
