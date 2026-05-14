/* eslint-disable no-console */
import type { BuildResult } from '../../types'
import type { LogLevel } from '../../utils/constants'
import type { BundlerLogLevel } from '../types'
import type { Bundler } from './bundler-types'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { BundlerNames, normalizePath } from './utils'

const version = __VITE_PWA_VERSION__

export function logPWAWorkboxResult(
  bundler: Bundler,
  strategy: string,
  buildResult: BuildResult,
  totalTime: number,
  logLevel: LogLevel,
  bundlersLogLevel: BundlerLogLevel,
  root: string = process.cwd(),
) {
  if (logLevel === 'silent')
    return

  const { count, size, filePaths, warnings } = buildResult

  const currentBundlerLogLevel = bundlersLogLevel[bundler] || 'info'

  if (currentBundlerLogLevel !== 'info' && currentBundlerLogLevel !== 'debug') {
    console.info(`\n${pc.cyan(pc.bold(`Vite PWA v${version} [${BundlerNames[bundler]}]`))}`)
    console.info(`${pc.dim('strategy')}  ${pc.magenta(strategy)}`)

    // Precaching Summary
    console.info(`${pc.dim('precache')}  ${pc.green(`${count} entries`)} ${pc.dim(`(${(size / 1024).toFixed(2)} KiB)`)}`)

    // Files generated table
    console.info(`\n${pc.green('✓')} files generated:`)

    // Single pass to collect data and calculate max lengths
    const { files, maxP, maxS } = filePaths.reduce((acc, fp) => {
      const np = normalizePath(path.relative(root, fp))
      const sizeStr = `${(fs.statSync(fp).size / 1024).toFixed(2)} kB`

      acc.files.push({ np, size: sizeStr })
      acc.maxP = Math.max(acc.maxP, np.length)
      acc.maxS = Math.max(acc.maxS, sizeStr.length)

      return acc
    }, { files: [] as { np: string, size: string }[], maxP: 0, maxS: 0 })

    for (const { np, size } of files) {
      const isMap = np.endsWith('.map')
      const line = `  ${np.padEnd(maxP)} ${size.padStart(maxS)}`

      if (isMap) {
        console.info(`${pc.dim(line)} ${pc.dim('│ map')}`)
      }
      else {
        // We only bold the size for primary files
        console.info(`${pc.dim(line.slice(0, maxP + 3))}${pc.bold(line.slice(maxP + 3))}`)
      }
    }

    console.info(`\n${pc.green(`✓ built in ${totalTime.toFixed(4)}ms`)}`)
  }

  // Warnings are always shown unless silent
  if (warnings && warnings.length > 0) {
    console.warn(pc.yellow(`\n${pc.bold('PWA Warnings:')}\n${warnings.map(w => `  ! ${w}`).join('\n')}\n`))
  }
}
