import type { ManifestEntry } from '@composable-vite-pwa/workbox-build/types'
import type { Plugin as RolldownPlugin } from 'rolldown'
import type { Plugin, PluginOption } from 'vite'
import { ViteWorkboxPWAPlugin } from '@composable-vite-pwa/workbox-build/build/vite/plugin'
import { defineConfig } from 'vite'

const swSrc = 'src/sw.ts'
const swDest = 'dist/sw.js'
const globDirectory = 'dist'

function virtualMessagePlugin(): Plugin {
  const virtual = 'virtual:message'
  const resolvedVirtual = `\0${virtual}`
  return {
    name: 'vite-plugin-test',
    resolveId(id) {
      return id === virtual ? resolvedVirtual : null
    },
    load(id) {
      if (id === resolvedVirtual)
        return `export const message = 'Message from Virtual Module Plugin'`
    },
  } satisfies Plugin
}

async function* additionalManifestEntriesGenerator(): AsyncGenerator<string | ManifestEntry, undefined, void> {
  const [{ hash }, { readFile }] = await Promise.all([
    import('node:crypto'),
    import('node:fs/promises'),
  ])
  yield {
    url: 'favicon.svg',
    revision: hash('md5', await readFile('public/favicon.svg'), { outputEncoding: 'hex' }),
  }
}

export default defineConfig({
  plugins: [
    virtualMessagePlugin(),
    ViteWorkboxPWAPlugin({
      strategy: 'build-sw',
      buildSW: {
        minify: false,
        sourcemap: true,
        swType: 'classic-and-module',
        swSrc,
        swDest,
        globDirectory,
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
        plugins: () => [virtualMessagePlugin() as RolldownPlugin],
        additionalManifestEntriesGenerator,
      },
    }) as PluginOption,
  ],
})
