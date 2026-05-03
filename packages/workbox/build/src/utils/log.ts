import type { InternalManifestEntry } from './types'
import pc from 'picocolors'
import { errors } from '../validation/errors'

export function checkMaximumFileSizeToCacheExceeded(
  maximumFileSizeToCacheInBytes: number,
  maxFileSizeExceeded: InternalManifestEntry[],
) {
  if (maxFileSizeExceeded.length === 0) {
    return undefined
  }

  const limitStr = formatBytes(maximumFileSizeToCacheInBytes)
  return [
    `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red('Maximum file size exceeded for precaching!')}\n\n`,
    `The following assets exceed the configured limit of ${pc.cyan(limitStr)}:\n`,
    `${maxFileSizeExceeded.map(e =>
      `  - ❌ ${pc.magenta(e.url)} (${pc.yellow(formatBytes(e.size))})`,
    ).join('\n')}\n\n`,
    `${pc.bold('To resolve this issue, you can either:')}\n`,
    `  1. Increase the ${pc.green('"maximumFileSizeToCacheInBytes"')} option (current: ${pc.yellow(limitStr)}).\n`,
    `  2. Exclude these files from the precache using ${pc.green('"globIgnores"')}.\n\n`,
    `${pc.dim('For more information, please check the official FAQ:')}\n`,
    `👉 ${pc.cyan('https://vite-pwa-org.netlify.app/guide/faq.html#missing-assets-from-sw-precache-manifest')}\n`,
  ].join('')
}

export function checkInvalidPatterns(isStrict: boolean, invalidPatterns: string[]) {
  if (invalidPatterns.length === 0) {
    return undefined
  }
  const color = isStrict ? pc.red : pc.yellow
  return [
    `\n${color(pc.bold('[Vite PWA]'))} ${color(errors['useless-glob-pattern'])}`,
    invalidPatterns.map(e => `  - ${e}`).join('\n'),
    '',
    pc.bold('To resolve this issue, you can either:'),
    `  1. Disable ${pc.green('"globStrict"')}${isStrict ? ' to convert this error into a warning' : ''}.`,
    `  2. Remove/Update previous patterns from ${pc.green('"globPatterns"')}.\n\n`,
  ].filter(Boolean).join('\n')
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
 * Warn the user about using the barrel export in IIFE/Classic mode.
 */
export function warnSwkitBarrel() {
  console.warn([
    `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('Oh, you sweet summer child...')}`,
    `You're using the ${pc.cyan('\'@vite-pwa/workbox-swkit\' barrel export')} in IIFE format.`,
    // `You're about to include the ${pc.red('KITCHEN SINK')} in your Service Worker.`,
    `Your users will need a NASA-grade connection to download this beast.`,
    `Switch to subpackage imports (e.g., ${pc.green('\'@vite-pwa/workbox-swkit/core\'')}) to save some souls.\n`,
  ].join('\n'))
}

function formatBytes(bytes: number) {
  if (bytes === 0)
    return `0 ${pc.dim('Bytes')}`
  const k = 1024
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = Number.parseFloat((bytes / k ** i).toFixed(2))
  return `${val} ${pc.dim(sizes[i])}`
}
