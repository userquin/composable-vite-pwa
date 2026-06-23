import type { VitePWAPluginContext } from '@composable-vite-pwa/unplugin-pwa/node/vite/vite-context'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'

function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return fs.statSync(file, { throwIfNoEntry: false })
  }
  catch {
    // Ignore errors
  }
}

function findNearestNodeModules(basedir: string): string | null {
  while (basedir) {
    const pkgPath = path.join(basedir, 'node_modules')
    if (tryStatSync(pkgPath)?.isDirectory()) {
      return pkgPath
    }

    const nextBasedir = path.dirname(basedir)
    if (nextBasedir === basedir)
      break
    basedir = nextBasedir
  }

  return null
}

function resolveTempFolder(): string {
  const base = pathToFileURL(`${process.cwd()}/`).href

  const nodeModulesDir
    = typeof process.versions.deno === 'string'
      ? undefined
      : findNearestNodeModules(base)

  return nodeModulesDir
    ? path.resolve(nodeModulesDir, '.pwa-dev-dist')
    : path.resolve(process.cwd(), base, '.pwa-dev-dist')
}

export async function prepareTempFolder(
  ctx: VitePWAPluginContext<any, any, any, any>,
) {
  const tempFolderResolver = ctx.resolvedOptions.devOptions?.resolveTempFolder
  const tempFolder = tempFolderResolver
    ? await tempFolderResolver()
    : resolveTempFolder()

  fs.rmSync(tempFolder, { force: true, recursive: true })

  fs.mkdirSync(tempFolder, { recursive: true })

  ctx.dev.options!.tempFolder = tempFolder
}
