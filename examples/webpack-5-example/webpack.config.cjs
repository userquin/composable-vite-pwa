'use strict'

const path = require('node:path')
/** @type {import('@composable-vite-pwa/workbox-build/build/webpack').WorkboxPlugin} */
const { WorkboxPlugin } = require('@composable-vite-pwa/workbox-build/build/webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')

const outputPath = path.resolve(__dirname, 'dist')

/** @type {import('@composable-vite-pwa/workbox-build/types').SWTarget} */
const swType = 'classic-and-module'
const swName = 'sw.js'

/** @type {import('@composable-vite-pwa/workbox-build/config/types').GenerateSWOptions} */
const generateSW = {
  swType,
  swDest: `${outputPath}/${swName}`,
  // globIgnores: ['**!/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**!/!*.map'],
  // globDirectory: outDir ? `./${outDir}` : './dist',
  globPatterns: ['**/*.{js,css,html,svg,png}'],
  dontCacheBustURLsMatching: /[\\/]?assets[\\/]/,
  sourcemap: true,
  minify: false,
  workboxRuntimeCompatible: false,
  inlineWorkboxRuntime: false,
  chunkNames: 'dot',
  manifest: true,
  runtimeCaching: [{
    urlPattern: ({ request, sameOrigin }) => {
      console.log(import.meta.env)
      return sameOrigin && request.mode === 'navigate'
    },
    handler: 'NetworkOnly',
    options: {
      plugins: [{
        /* this callback will be called when the fetch call fails */
        handlerDidError: async () => Response.redirect('404', 302),
        /* this callback will prevent caching the response */
        cacheWillUpdate: async () => null,
      }],
    },
  }],
}

/** @type {import('webpack').Configuration} */
module.exports = {
  // ── Entry ────────────────────────────────────────────────────────
  entry: './src/main.js',

  // ── Output ──────────────────────────────────────────────────────
  output: {
    path: path.resolve(__dirname, 'dist'),

    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
    assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
    clean: true,
  },

  mode: 'production',

  resolve: {
    extensions: ['.js', '.mjs', '.json'],
    conditionNames: ['import', 'module', 'browser', 'default'],
  },

  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg|woff2?)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(ico)$/i,
        type: 'asset/inline',
      },
      {
        test: /\.(webp)$/i,
        type: 'asset',
        parser: { dataUrlCondition: { maxSize: 8 * 1024 } },
      },
    ],
  },

  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
    runtimeChunk: 'single',

    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
        },
      },
    },
  },

  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    /** @type {import('@composable-vite-pwa/workbox-build/build/webpack').WorkboxPlugin} */
    new WorkboxPlugin('generateSW',
      /** @type {import('@composable-vite-pwa/workbox-build/config/types').WorkboxBuildConfiguration} */
      {
        generateSW,
      }),
  ],
}
