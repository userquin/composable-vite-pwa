import type { Plugin, PluginOption } from 'vite'
import { VitePWA } from '@composable-vite-pwa/unplugin-pwa'
import { defineConfig } from 'vite'
import Inspect from 'vite-plugin-inspect'

const swSrc = 'src/sw.ts'
const swDest = 'sw.js'

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

export default defineConfig({
  build: {
    manifest: true,
    minify: false,
  },
  plugins: [
    // virtualMessagePlugin(),
    VitePWA({
      swType: 'classic-and-module',
      strategies: 'build-sw',
      includeAssets: [/* 'favicon.ico', */'favicon.svg'],
      // includeManifestIcons: true,
      minify: false,
      pwaAssets: {
        config: false,
        preset: 'minimal-2023',
        htmlPreset: '2023',
        includeHtmlHeadLinks: true,
        injectThemeColor: true,
        overrideManifestIcons: true,
      },
      manifest: {
      },
      buildSW: {
        sourcemap: true,
        manifest: true,
        globPatterns: ['**/*.{js,html,css,ico,png}'],
        swSrc,
        customChunks: (moduleId, ctx) => {
          if (ctx.getModuleInfo(moduleId)?.id.includes('sw-helper')) {
            return 'sw-helper'
          }
        },
        plugins: () => [virtualMessagePlugin()],
      },
      generateSW: {
        sourcemap: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }) as PluginOption,
    Inspect(),
  ],
})
