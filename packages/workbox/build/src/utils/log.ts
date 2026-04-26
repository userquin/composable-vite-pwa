import type { InternalManifestEntry } from './types'
import pc from 'picocolors'

export function checkMaximumFileSizeToCacheExceeded(
  maximumFileSizeToCacheInBytes: number,
  maxFileSizeExceeded: InternalManifestEntry[],
) {
  let message: string | undefined
  if (maxFileSizeExceeded.length > 0) {
    const formatBytes = (bytes: number) => {
      if (bytes === 0)
        return `0 ${pc.dim('Bytes')}`
      const k = 1024
      const sizes = ['Bytes', 'KiB', 'MiB', 'GiB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      const val = Number.parseFloat((bytes / k ** i).toFixed(2))
      return `${val} ${pc.dim(sizes[i])}`
    }

    const limitStr = formatBytes(maximumFileSizeToCacheInBytes)
    message = [
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

  return message
}
