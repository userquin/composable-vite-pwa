import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { WorkboxPlugin } from '@composable-vite-pwa/workbox-build/build/webpack'
import HtmlWebpackPlugin from 'html-webpack-plugin'

// switch type to module at package.json => or try to use __dirname here with require + globalThis
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const outputDir = path.resolve(__dirname, 'dist')

process.env.VITE_XXX = 'xxxx'
process.env.SECRET_YYY = 'yyyy'
process.env.VITE_SW_BUILDER = 'webpack'
process.env.PUBLIC_SW_BUILDER = 'webpack'

/** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
const swType = 'classic-and-module'
const swName = 'sw.js'

/** @type {import('@composable-vite-pwa/workbox-build/config/types').GenerateSWOptions} */
const generateSW = {
  swType,
  swDest: `dist/${swName}`,
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
export default {
  entry: './src/main.js',

  output: {
    path: outputDir,
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
    new WorkboxPlugin(
      'generate-sw',
      {
        generateSW,
      },
    ),
  ],
}
