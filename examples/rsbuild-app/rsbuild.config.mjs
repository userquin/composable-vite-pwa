import { WorkboxPlugin } from '@composable-vite-pwa/workbox-build/build/rspack'
import { defineConfig } from '@rsbuild/core'

export default defineConfig({
  source: {
    entry: {
      index: './src/index.js',
    },
  },
  html: {
    title: 'Rsbuild PWA',
  },
  output: {
    cleanDistPath: true,
    distPath: {
      root: 'dist',
      js: 'assets',
      css: 'assets',
    },
    sourceMap: {
      js: 'source-map',
    },
  },
  tools: {
    rspack: {
      plugins: [
        new WorkboxPlugin('build-sw', {
          buildSW: {
            options: {
              swSrc: 'src/sw.js',
              swDest: 'sw.js',
              globPatterns: ['**/*.{html,js,css,svg,png}'],
              injectionPoint: 'globalThis.__WB_MANIFEST',
              inlineWorkboxRuntime: true,
              sourcemap: true,
              mode: 'production',
              manifest: true,
            },
          },
        }),
      ],
    },
  },
})
