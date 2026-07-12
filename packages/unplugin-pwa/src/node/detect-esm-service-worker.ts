import type { VitePWAOptions } from './types'
import { promises as fs } from 'node:fs'
import pc from 'picocolors'

/**
 * Detects if the service worker source file is an ESM (ECMAScript Module) service worker.
 * @param options The PWA options.
 * @return whether the service worker is an ESM module or not.
 */
export async function detectEsmServiceWorker(
  options: Partial<VitePWAOptions<any, any>>,
): Promise<boolean> {
  const { strategies = 'generateSW' } = options
  if (!(strategies === 'injectManifest' || strategies === 'inject-manifest')) {
    return false
  }

  const swSrc = options.injectManifest?.swSrc
  if (!swSrc) {
    return false
  }

  let parseSync: undefined | ((filename: string, sourceCode: string) => { program: unknown })
  try {
    const vite = await import('@composable-vite-pwa/workbox-build/build/vite').then(({
      detect,
    }) => detect({
      vite: true,
    }).then(({ vite }) => (
      vite === true
    )))
    parseSync = vite
      ? await import('vite').then(m => 'parseSync' in m ? m.parseSync : undefined!)
      : await import('rolldown/utils').then(({ parseSync }) => parseSync)
  }
  catch {
  }

  if (!parseSync) {
    parseSync = await import('rolldown/utils').then(({ parseSync }) => parseSync)
  }

  function visit(node: unknown): boolean {
    if (!node || typeof node !== 'object') {
      return false
    }
    if (Array.isArray(node)) {
      for (const child of node) {
        if (visit(child)) {
          return true
        }
      }
    }

    const record = node as Record<string, unknown> & { type?: string }
    switch (record.type) {
      case 'ImportExpression':
        throw new Error(
          `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red(`Dynamic import() is not supported in a service worker: ${swSrc}!`)}\n`,
        )
      case 'ExportNamedDeclaration':
      case 'ExportDefaultDeclaration':
      case 'ExportAllDeclaration':
        throw new Error(
          `\n${pc.red(pc.bold('[Vite PWA]'))} ${pc.red(`Export declarations are not supported in a service worker: ${swSrc}!`)}\n`,
        )
      case 'ImportDeclaration':
      case 'MetaProperty': // import.meta
        return true
    }

    for (const key in record) {
      if (key !== 'type') {
        if (visit(record[key])) {
          return true
        }
      }
    }

    return false
  }

  try {
    return visit(parseSync!(
      swSrc,
      await fs.readFile(swSrc, 'utf-8'),
    ).program)
  }
  catch {
    return false
  }
}
