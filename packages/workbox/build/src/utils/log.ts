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

function formatBytes(bytes: number) {
  if (bytes === 0)
    return `0 ${pc.dim('Bytes')}`
  const k = 1024
  const sizes = ['Bytes', 'KiB', 'MiB', 'GiB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  const val = Number.parseFloat((bytes / k ** i).toFixed(2))
  return `${val} ${pc.dim(sizes[i])}`
}
