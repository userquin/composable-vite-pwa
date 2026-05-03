import fs from 'node:fs/promises'
import path from 'node:path'
import MagicString from 'magic-string'
import { rolldown } from 'rolldown'
// eslint-disable-next-line antfu/no-import-dist
import { t as generateManifestEntries } from '../../packages/workbox/build/dist/generate-manifest-entries-Czw0XH0g.mjs'
import { VirtualPlugin } from './virtual-plugin'

const workboxRegex = [/^@composable-vite-pwa\/workbox-swkit\//, /[\\/]workbox-swkit[\\/]/, /[\\/]workbox[\\/]swkit/]

function resolve(name) {
  return path.resolve(import.meta.dirname, `${name}.js`)
}

function BuildPlugin(
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType,
  /** @type {string} */
  swName,
) {
  /** @type {import('vite').Plugin} */
  return {
    name: 'vite-plugin-pwa:build',
    apply: 'build',
    enforce: 'post',
    closeBundle: {
      enforce: 'post',
      async handler() {
        const manifestResult = await generateManifestEntries({
          globIgnores: ['**/{sw,workbox,workbox-*,classic-sw,module-sw}.js', '**/*.map'],
          globPatterns: ['**/*.{js,html}'],
          dontCacheBustURLsMatching: /[\\/]assets[\\/]/,
        }, './dist')
        const instance = await rolldown({
          input: `src/${swName}`,
          platform: 'browser',
          treeshake: true,
          plugins: [VirtualPlugin(), {
            name: 'import-scripts-tranformer',
            // writeBundle({ file, name }, bundle) {
            //   console.log({ file, name }, Object.keys(bundle))
            // },
            generateBundle(_, bundle, isWrite) {
              if (swType === 'module') {
                return
              }
              console.log('generateBundle', isWrite)
              // Buscamos el chunk de workbox para saber su nombre final con hash
              const workboxChunk = Object.values(bundle).find(
                c => c.type === 'chunk' && c.name === 'workbox',
              )

              if (!workboxChunk)
                return

              const workboxFileName = workboxChunk.fileName

              for (const [key, chunk] of Object.entries(bundle)) {
                if (chunk.type !== 'chunk')
                  continue

                const s = new MagicString(chunk.code)

                // --- CASO 1: EL CORE DE WORKBOX (Limpieza de exports) ---
                if (chunk.name === 'workbox') {
                  const s = new MagicString(chunk.code)

                  // 1. Envolvemos el contenido, pero OJO: buscamos el sourcemap para dejarlo fuera
                  const mapRegex = /\/\/# sourceMappingURL=.*/
                  const mapMatch = chunk.code.match(mapRegex)
                  let codeWithoutMap = chunk.code

                  if (mapMatch) {
                    codeWithoutMap = chunk.code.replace(mapRegex, '')
                    s.remove(mapMatch.index, chunk.code.length)
                  }

                  s.prepend('(function() {\n')

                  const exportRegex = /export\s*\{([^}]+)\};?/g
                  let match
                  while ((match = exportRegex.exec(codeWithoutMap)) !== null) {
                    const [fullMatch, content] = match
                    const members = content.split(',').map(e => e.trim().split(/\s+as\s+/)[0].trim()).join(', ')

                    // Sustituimos el export por la asignación
                    const replacement = `\nself.workbox = self.workbox || {};\nself.workbox.swkit = { ${members} };`
                    s.overwrite(match.index, match.index + fullMatch.length, replacement)
                  }

                  s.append('\n})();')

                  // 2. Si había mapa, lo volvemos a poner al final de todo, fuera del IIFE
                  if (mapMatch) {
                    s.append(`\n${mapMatch[0]}`)
                  }

                  chunk.code = s.toString()
                }

                // --- CASO 2: EL SERVICE WORKER (Limpieza de imports) ---
                if (chunk.name === 'sw') {
                  s.prepend(`importScripts("./${workboxFileName}");\n`)

                  const importRegex = new RegExp(
                    `import\\s+\\{([^}]+)\\}\\s+from\\s+['"]\\.\\/${workboxFileName}['"]`,
                    'g',
                  )

                  let match
                  while ((match = importRegex.exec(chunk.code)) !== null) {
                    const [fullMatch, imports] = match

                    // Aquí lo mismo: el 'as' no existe en desestructuración de objetos de la misma forma
                    // Pero en un 'import { a as b }', 'b' es el identificador local que Rolldown ha dejado.
                    const cleanImports = imports.split(',').map((i) => {
                      const parts = i.trim().split(/\s+as\s+/)
                      return parts.length > 1 ? parts[1].trim() : parts[0].trim()
                    }).join(', ')

                    const replacement = `const { ${cleanImports} } = self.workbox.swkit;`
                    s.overwrite(match.index, match.index + fullMatch.length, replacement)
                  }
                }

                // Si el mapa de símbolos está activado en la config de Rolldown,
                // actualizamos el chunk con el nuevo código y el mapa resultante
                if (s.hasChanged()) {
                  chunk.code = s.toString()
                  /* if (chunk.map) {
                    const newMap = s.generateMap({
                      source: chunk.fileName,
                      includeContent: true,
                      hires: true,
                    })
                    chunk.map = {
                      file: newMap.file,
                      mappings: newMap.mappings,
                      names: newMap.names,
                      sources: ['sw-split.js'],
                      sourcesContent: newMap.sourcesContent ? newMap.sourcesContent : [],
                      version: newMap.version,
                      debugId: chunk.map.debugId,
                      x_google_ignoreList: chunk.map.x_google_ignoreList,
                      toUrl: newMap.toUrl,
                      toString: newMap.toString,
                    }
                  } */
                }
              }
            },
          }],
          transform: {
            define: {
              'process.env.NODE_ENV': JSON.stringify('production'),
              'self.__WB_MANIFEST': JSON.stringify(manifestResult.manifestEntries),
            },
          },
        })

        const result = await instance.write({
          sourcemap: true,
          // sourcemap: 'inline',
          // sourcemap: 'hidden',
          comments: {
            legal: true,
            jsdoc: false,
            annotation: false,
          },
          dir: 'dist',
          // file: 'build/sw-split.js',
          format: 'esm',
          cleanDir: false,
          chunkFileNames: (chunk) => {
            console.log('chunkFileNames', chunk.name)
            switch (chunk.name) {
              case 'workbox':
                return `workbox-${swType}-[hash].js`
              case 'sw':
                return swType === 'classic' ? `classic-${swName}` : `module-${swName}`
              default:
                return '[name]-[hash].[ext]'
            }
          },
          assetFileNames: '[name]-[hash].[ext]',
          entryFileNames: (chunk) => {
            console.log('entryFileNames', chunk.name)
            switch (chunk.name) {
              case 'workbox':
                return `workbox-${swType}-[hash].js`
              case 'sw':
                return swType === 'classic' ? `classic-${swName}` : `module-${swName}`
              default:
                return '[name]-[hash].[ext]'
            }
          },
          codeSplitting: {
            groups: [{
              minSize: 0,
              name: (moduleId) => {
                return workboxRegex.some(r => r.test(moduleId)) ? 'workbox' : undefined
              },
            }],
          },
        })
        console.log(result.output.map(c => [c.name, c.fileName]))
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
function PWAPlugin(
  /** @type {string} */
  swName,
  /** @type {import('@composable-vite-pwa/workbox-build/types').SWType} */
  swType = 'classic-and-module',
) {
  /** @type {import('vite').PluginOption} */
  return swType === 'classic-and-module'
    ? [
        BuildPlugin('classic', swName),
        BuildPlugin('module', swName),
        VirtualPWARegister(swType, swName),
      ]
    : [
        BuildPlugin(swType, swName),
        VirtualPWARegister(swType, swName),
      ]
}

export { PWAPlugin }
