import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  buildSW,
} from '@composable-vite-pwa/workbox-build/build/vite/build-sw'
import {
  generateSW,
} from '@composable-vite-pwa/workbox-build/build/vite/generate-sw'
import {
  buildSWLegacy,
} from '@composable-vite-pwa/workbox-build/build/vite/legacy-build-sw'
import {
  generateSWLegacy,
} from '@composable-vite-pwa/workbox-build/build/vite/legacy-generate-sw'
import { VirtualPlugin } from './virtual-plugin'

function resolve(name) {
  return path.resolve(import.meta.dirname, `${name}.js`)
}

const methods = {
  buildSW: {
    'vite-build-sw': buildSW,
    'legacy-build-sw': buildSWLegacy,
  },
  generateSW: {
    'vite-generate-sw': generateSW,
    'legacy-generate-sw': generateSWLegacy,
  },
}

function BuildPlugin2(
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType,
  /** @type {string} */
  swName,
  /** @type {'vite-build-sw'|'legacy-build-sw'|'vite-generate-sw'|'legacy-generate-sw'} */
  buildType,
  /** @type {string|string[]|undefined} */
  envPrefix,
  /** @type {string|undefined} */
  outDir,
) {
  /** @type {import('vite').Plugin} */
  return {
    name: 'vite-plugin-pwa:build',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      enforce: 'post',
      async handler() {
        /** @type {import('@composable-vite-pwa/workbox-build/build/types').BuildGenerateSWOptions} */
        const generateData = {
          swType,
          swDest: outDir ? `${outDir}/${swName}` : `dist/${swName}`,
          // globIgnores: ['**!/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**!/!*.map'],
          globDirectory: outDir ? `./${outDir}` : './dist',
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          dontCacheBustURLsMatching: /[\\/]?assets[\\/]/,
          sourcemap: true,
          minify: false,
          workboxRuntimeCompatible: false,
          inlineWorkboxRuntime: false,
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

        process.env.VITE_XXX = 'xxxx'
        process.env.SECRET_YYY = 'yyyy'
        process.env.VITE_SW_BUILDER = buildType
        process.env.PUBLIC_SW_BUILDER = buildType

        /** @type {import('@composable-vite-pwa/workbox-build/build/vite/types').BuildServiceWorkerOptions} */
        const buildData = {
          swType,
          swSrc: `src/${swName}`,
          swDest: outDir ? `${outDir}/${swName}` : `dist/${swName}`,
          // globIgnores: ['**!/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**/*.map'],
          globDirectory: './dist',
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          dontCacheBustURLsMatching: /[\\/]?assets[\\/]/,
          sourcemap: true,
          minify: false,
          workboxRuntimeCompatible: false,
          inlineWorkboxRuntime: true,
          envPrefix,
          plugins: () => [VirtualPlugin()],
          customChunks: (moduleId) => {
            if (moduleId.includes('circular-dep-1.js')) {
              return 'chunk-circular-1'
            }
            if (moduleId.includes('circular-dep-2.js')) {
              return 'chunk-circular-2'
            }
            if (moduleId === '\0virtual:sw-chunk') {
              return 'virtual-sw-chunk'
            }
            if (/[\\/]a\.js$/.test(moduleId)) {
              return 'chunk-a'
            }
            if (/[\\/]b\.js$/.test(moduleId)) {
              return 'chunk-b'
            }
            if (/[\\/]c\.js$/.test(moduleId)) {
              return 'chunk-c'
            }
            return undefined
          },
        }

        /* , {
      priority: 1,
      test: /[\\/]a\.js$/,
      name: 'chunk-a',
    }, {
      priority: 1,
      test: /[\\/]b\.js$/,
      name: 'chunk-b',
    }, {
      priority: 1,
      test: /[\\/]c\.js$/,
      name: 'chunk-c',
    }, {
      priority: 1,
      test: /[\\/]circular-dep-1\.js$/,
      name: 'chunk-circular-1',
    }, {
      priority: 1,
      test: /[\\/]circular-dep-2\.js$/,
      name: 'chunk-circular-2',
    }
         */

        console.log(`Running ${buildType}...`)
        const isBuild = buildType.includes('build-sw')
        const data = isBuild ? buildData : generateData
        const buildResult = await methods[isBuild ? 'buildSW' : 'generateSW'][buildType](data)
        console.log(buildResult)
      },
    },
  }
}
function VirtualPWARegister(
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType,
  /** @type {string} */
  swName,
) {
  const __SW_URL__ = JSON.stringify(swName)
  const __SW_TYPE__ = JSON.stringify(swType === 'classic-and-module' ? 'classic' : swType)
  const swChunkName = path.basename(swName, path.extname(swName))
  const __SW_CLASSIC_URL__ = JSON.stringify(swType === 'classic-and-module' ? `${swChunkName}-classic.js` : swName)
  const __SW_MODULE_URL__ = JSON.stringify(swType === 'classic-and-module' ? `${swChunkName}-module.js` : swName)
  const PWA_ESM_FALLBACK_SW = JSON.stringify(swType === 'classic-and-module')
  /** @type {import('vite').Plugin} */
  return {
    name: 'vite-plugin-pwa:virtual',
    enforce: 'pre',
    config() {
      return {
        define: {
          __SW_URL__,
          __SW_TYPE__,
          __SW_CLASSIC_URL__,
          __SW_MODULE_URL__,
          '__SW_SCOPE__': JSON.stringify('/'),
          '__SW_AUTO_UPDATE__': JSON.stringify(true),
          '__SW_SELF_DESTROYING__': JSON.stringify(false),
          '__SW_UPDATE_VIA_CACHE__': JSON.stringify('all'),
          'process.env.PWA_ESM_FALLBACK_SW': PWA_ESM_FALLBACK_SW,
        },
      }
    },
    resolveId(id) {
      return id === 'virtual:pwa-register' ? `\0virtual:pwa-register` : undefined
    },
    load(id) {
      if (id === `\0virtual:pwa-register`) {
        return fs.readFile(resolve('../../packages/core/dist/client/build/register'), 'utf-8')
      }
    },
  }
}

/**
 *
 * @param swName string
 * @param swType {'classic'|'module'|'classic-and-module'}
 * @param buildType {'vite-build-sw'|'legacy-build-sw'|'vite-generate-sw'|'legacy-generate-sw'}
 * @param envPrefix {string|string[]|undefined}
 * @param outDir {string|undefined}
 * @return {({name: string, apply: string, enforce: string, closeBundle: {enforce: string, handler(): Promise<void>}}|{name: string, enforce: string, config(): {define: {__SW_URL__: *, __SW_TYPE__: *, __SW_CLASSIC_URL__: *, __SW_MODULE_URL__: *, __SW_SCOPE__: *, __SW_AUTO_UPDATE__: *, __SW_SELF_DESTROYING__: *, __SW_UPDATE_VIA_CACHE__: *, "process.env.PWA_ESM_FALLBACK_SW": *}}, resolveId(*): string|undefined, load(*): (Promise<>|undefined)})[]}
 * @constructor
 */
function PWAPlugin2(
  /** @type {string} */
  swName,
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType,
  /** @type {'vite-build-sw'|'legacy-build-sw'|'vite-generate-sw'|'legacy-generate-sw'} */
  buildType,
  /** @type {string|string[]|undefined} */
  /** @type {string|string[]|undefined} */
  envPrefix,
  /** @type {string|undefined} */
  outDir,
) {
  /** @type {import('vite').PluginOption} */
  return [
    BuildPlugin2(
      swType,
      swName,
      buildType || 'vite-build-sw',
      envPrefix || 'VITE_',
      outDir,
    ),
    VirtualPWARegister(swType, swName),
  ]
}

export { PWAPlugin2 }
