import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import {
  buildSW as viteBuildSW,
} from '@composable-vite-pwa/workbox-build/build/vite/build-sw'
import {
  generateSW as viteGenerateSW,
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
    'vite-build-sw': viteBuildSW,
    'legacy-build-sw': buildSWLegacy,
  },
  generateSW: {
    'vite-generate-sw': viteGenerateSW,
    'legacy-generate-sw': generateSWLegacy,
  },
}

function BuildPlugin2(
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType,
  /** @type {string} */
  swName,
  /** @type {'vite-build-sw'|'rolldown-build-sw'|'vite-generate-sw'|'rolldown-generate-sw'} */
  buildType,
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
          swDest: `dist/${swName}`,
          // globIgnores: ['**!/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**!/!*.map'],
          globDirectory: './dist',
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          dontCacheBustURLsMatching: /[\\/]?assets[\\/]/,
          sourcemap: true,
          minify: false,
          inlineWorkboxRuntime: false,
        }

        process.env.VITE_XXX = 'xxxx'
        process.env.SECRET_YYY = 'yyyy'
        process.env.VITE_SW_BUILDER = buildType

        /** @type {import('@composable-vite-pwa/workbox-build/build/vite/types').BuildServiceWorkerOptions} */
        const buildData = {
          swType,
          swSrc: `src/${swName}`,
          swDest: `dist/${swName}`,
          // globIgnores: ['**!/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**/*.map'],
          globDirectory: './dist',
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          dontCacheBustURLsMatching: /[\\/]?assets[\\/]/,
          sourcemap: true,
          minify: false,
          inlineWorkboxRuntime: false,
          plugins: () => [VirtualPlugin()],
        }
        console.log(`Running ${buildType}...`)
        const isBuild = buildType.includes('build-sw')
        const data = isBuild ? buildData : generateData
        const now = performance.now()
        const result = await methods[isBuild ? 'buildSW' : 'generateSW'][buildType](data)
        console.log(result)
        console.log(performance.now() - now)
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
  const __SW_CLASSIC_URL__ = JSON.stringify(swType === 'classic-and-module' ? `classic-${swName}` : swName)
  const __SW_MODULE_URL__ = JSON.stringify(swType === 'classic-and-module' ? `module-${swName}` : swName)
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
 * @return {({name: string, apply: string, enforce: string, closeBundle: {enforce: string, handler(): Promise<void>}}|{name: string, enforce: string, config(): {define: {__SW_URL__: *, __SW_TYPE__: *, __SW_CLASSIC_URL__: *, __SW_MODULE_URL__: *, __SW_SCOPE__: *, __SW_AUTO_UPDATE__: *, __SW_SELF_DESTROYING__: *, __SW_UPDATE_VIA_CACHE__: *, "process.env.PWA_ESM_FALLBACK_SW": *}}, resolveId(*): string|undefined, load(*): (Promise<>|undefined)})[]}
 * @constructor
 */
function PWAPlugin2(
  /** @type {string} */
  swName,
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType = 'classic-and-module',
  /** @type {'vite-build-sw'|'legacy-build-sw'|'vite-generate-sw'|'legacy-generate-sw'} */
  buildType,
) {
  /** @type {import('vite').PluginOption} */
  return [
    BuildPlugin2(swType, swName, buildType || 'vite-build-sw'),
    VirtualPWARegister(swType, swName),
  ]
}

export { PWAPlugin2 }
