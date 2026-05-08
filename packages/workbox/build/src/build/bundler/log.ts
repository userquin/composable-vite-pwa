import type { GenerateSWDependenciesResult } from './detector-types'
import pc from 'picocolors'

/**
 * Checks for GenerateSW dependencies based on Vite version and Rolldown availability.
 * If Vite < 8.0.0 is used, Rolldown is mandatory for the orchestration.
 *
 * @param result - The dependency detection result (versions and presence).
 * @param isDev - Whether to log a warning (dev) or return an error string (build).
 */
export function checkGenerateSWDependencies(
  { magicast, rolldown, vite }: GenerateSWDependenciesResult,
  isDev = false,
): string | undefined {
  // 1. Magicast is always required for AST code generation.
  // 2. We need a valid bundler:
  //    - Rolldown >= 1.0.0-0 OR
  //    - Vite >= 8.0.0 (which includes Rolldown internally)
  const isVite8 = vite === true
  const hasValidBundler = rolldown || isVite8

  if (magicast && hasValidBundler) {
    return undefined
  }

  const color = isDev ? pc.yellow : pc.red
  const title = isDev ? 'POTENTIAL BUILD FAILURE' : 'MISSING DEPENDENCIES'
  const missing: string[] = []
  const incompatible: string[] = []

  // Magicast check
  if (magicast === undefined) {
    missing.push('magicast')
  }
  else if (!magicast) {
    incompatible.push('magicast (^0.5.0)')
  }

  let addVite8Incompatibility = false

  // Bundler logic check
  if (!rolldown && !isVite8) {
    if (vite === false) {
      // Vite is present but version is < 8.0.0
      incompatible.push('vite (^8.0.0)')
      addVite8Incompatibility = true
    }
    else if (rolldown === false) {
      incompatible.push('rolldown (^1.0.0-0)')
    }
    else {
      missing.push('rolldown')
    }
  }

  if (missing.length === 0 && incompatible.length === 0) {
    return undefined
  }

  const lines = [
    `\n${color(pc.bold('[Vite PWA]'))} ${color(title)}`,
    `The ${pc.cyan('generateSW')} strategy requires additional dependencies to generate the Service Worker.\n`,
    addVite8Incompatibility
      ? `${pc.cyan('Note:')} Your Vite version is < 8. To use ${pc.green('generateSW')}, you must either upgrade Vite or install ${pc.green('rolldown')}.\n`
      : undefined,
  ].filter(Boolean) as string[]

  if (missing.length > 0) {
    lines.push(`${pc.bold('Missing dependencies:')}`)
    missing.forEach(dep => lines.push(`  - ${pc.red(dep)}`))
    lines.push('')
  }

  if (incompatible.length > 0) {
    lines.push(`${pc.bold('Incompatible versions:')}`)
    incompatible.forEach(dep => lines.push(`  - ${pc.yellow(dep)}`))
    lines.push('')
  }

  lines.push(`${pc.bold('To resolve this, please run:')}`)

  const toInstall: string[] = []
  if (!magicast) {
    toInstall.push('magicast')
  }

  // If Vite is legacy (< 8) or missing, we force/suggest Rolldown
  if (!rolldown) {
    toInstall.push('rolldown')
  }

  lines.push(`  ${pc.green(`npm add -D ${toInstall.join(' ')}`)}\n`)

  if (isDev) {
    lines.push(`${pc.dim('This check is for the "generateSW" strategy. Other strategies like "injectManifest" (legacy) might not require these.')}`)
  }
  else {
    lines.push(`${pc.red('Error: Build stopped. The current environment cannot bundle the Service Worker.')}`)
  }

  return lines.join('\n')
}

export function logDeprecatedGenerateSW() {
  console.warn([
    `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('DEPRECATION WARNING')}:`,
    `You are using ${pc.cyan('generateSW()')}, which is now deprecated.`,
    `Please migrate to ${pc.green('generateModernSW()')} or ${pc.green('generateClassicSW()')}.`,
    `This function will be removed in the next major version.\n`,
  ].join('\n'))
}

export function throwInvalidInjectionPoint(): never {
  const message = [
    `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Invalid configuration for injectManifest!')}\n`,
    `You have disabled ${pc.green('"injectionPoint"')} (set to null or false), but you are calling`,
    `the ${pc.cyan('injectManifest()')} function directly.\n`,
    `${pc.bold('To resolve this issue:')}`,
    `  - If you want to disable injection, ensure you are not using the default ${pc.cyan('injectManifest')} from ${pc.cyan('\'@vite-pwa/workbox-build/injectManifest\'')} tool.`,
    `  - If you need a custom build without injection, use the ${pc.cyan('buildSW')} from ${pc.cyan('\'@vite-pwa/workbox-build/build\'')} instead.\n`,
  ].join('\n')

  throw new Error(message)
}

/**
 * Error when the options object doesn't match any known strategy.
 */
export function throwUnknownBuildOptions(): never {
  throw new Error(
    `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Unknown Vite build options!')}\n`
    + `The options object must contain one of: ${pc.cyan('"generateSW"')}, ${pc.cyan('"injectManifest"')} or ${pc.cyan('"buildSW"')}.\n`,
  )
}

/**
 * Error when buildSW is called from the generic build package instead of the vite-specific one.
 */
export function throwViteBuildOptionsRequired(): never {
  throw new Error(
    `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Vite-specific options detected!')}\n\n`
    + `You are using ${pc.cyan('"buildSW"')}, but you imported ${pc.cyan('buildSW')} from the build subpackage export.\n`
    + `Please import it from the build Vite subpackage export instead:\n\n`
    + `  ${pc.green('import { buildSW } from \'@composable-vite-pwa/workbox-build/build/vite\'')}\n`,
  )
}

/**
 * Error when buildSW is called but the Vite version is not compatible (Vite 8+ required).
 */
export function throwInvalidViteVersion(): never {
  throw new Error(
    `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Incompatible Vite version!')}\n\n`
    + `The ${pc.cyan('"buildSW"')} strategy requires ${pc.green('Vite ^8.0.0')}.\n`
    + `Please upgrade your Vite dependency or use ${pc.cyan('"generateSW"')} / ${pc.cyan('"injectManifest"')} instead.\n`,
  )
}
