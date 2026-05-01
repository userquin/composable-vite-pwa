import type { Program } from '@babel/types'
import { generateCode, parseModule } from 'magicast'
import { describe, expect, it } from 'vitest'
import { warnSwkitBarrel } from '../src/utils/log'
import { stripTypescriptTypes } from '../src/utils/strip-typescript-types'

describe('parse-esm-service-worker', () => {
  async function extractWorkboxRuntimeImports(swCode: string) {
    const sw = parseModule<Program>(await stripTypescriptTypes(generateCode(parseModule(swCode), {
      format: {
        tabWidth: 2,
        useTabs: false,
        quote: 'single',
        trailingComma: false,
        arrayBracketSpacing: false,
        objectCurlySpacing: false,
        arrowParensAlways: true,
        useSemi: true,
      },
    }).code).then((result) => {
      if (!result.transformed) {
        return Promise.reject(new Error('Failed to strip TypeScript types'))
      }
      return result.code
    }))

    const exports = new Set<string>()

    if (!sw.imports.$items.length) {
      return { rewrite: false, exports }
    }

    const indicesToRemove: number[] = []

    sw.imports.$items.forEach((item, index) => {
      if (!item.from.startsWith('@composable-vite-pwa/workbox-swkit/')) {
        return
      }

      exports.add(item.from)

      indicesToRemove.push(index)
    })

    if (exports.size === 0) {
      return { rewrite: false, exports }
    }

    const program = sw.$ast as Program

    program.body = program.body.filter((node: any) => {
      // Si no es un import, lo dejamos
      if (node.type !== 'ImportDeclaration')
        return true

      // Si es un import de nuestro kit, lo fulminamos (devolvemos false)
      const source = node.source.value
      return !source.startsWith('@composable-vite-pwa/workbox-swkit/')
    })

    return {
      rewrite: true,
      exports,
      workbox: ``,
      code: `import * as workbox from "./workbox";
${generateCode(sw, {
  format: {
    tabWidth: 2,
    useTabs: false,
    quote: 'single',
    trailingComma: false,
    arrayBracketSpacing: false,
    objectCurlySpacing: false,
    arrowParensAlways: true,
    useSemi: true,
  },
}).code}      
`,
    }
  }
  it('js service worker', () => {
    const sw = parseModule(`
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'

precacheAndRoute(self.__WB_MANIFEST)

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('index.html'),
))

self.skipWaiting()
clientsClaim()
  `)

    expect(sw.imports).toBeDefined()
    expect(sw.imports.$items).toBeDefined()
    expect(sw.imports.$items.length).toBeGreaterThan(1)
    console.log(sw.imports.$items.length)
    console.log(sw.imports.$items.map(n => [n.from, n.imported] as const))
    expect(extractWorkboxRuntimeImports(sw)).toMatchInlineSnapshot()
  })

  it.only('ts service worker', async () => {
    warnSwkitBarrel()
    await expect(extractWorkboxRuntimeImports(`
import { clientsClaim } from '@composable-vite-pwa/workbox-swkit/core'
import type { urlManipulation } from '@composable-vite-pwa/workbox-swkit/precaching'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from '@composable-vite-pwa/workbox-swkit/precaching'
import { NavigationRoute, registerRoute } from '@composable-vite-pwa/workbox-swkit/routing'

const manipulate: urlManipulation = ({ url }) => []

precacheAndRoute(self.__WB_MANIFEST, {
  urlManipulation:  manipulate
})

// clean old assets
cleanupOutdatedCaches()

// to allow work offline
registerRoute(new NavigationRoute(
    createHandlerBoundToURL('index.html'),
))

self.skipWaiting()
clientsClaim()
`)).resolves.toMatchInlineSnapshot(`
  {
    "code": "import * as workbox from "./workbox";
  const manipulate                  = ({ url }) => []

  precacheAndRoute(self.__WB_MANIFEST, {
    urlManipulation:  manipulate
  })

  // clean old assets
  cleanupOutdatedCaches()

  // to allow work offline
  registerRoute(new NavigationRoute(
      createHandlerBoundToURL('index.html'),
  ))

  self.skipWaiting()
  clientsClaim()      
  ",
    "exports": Set {
      "@composable-vite-pwa/workbox-swkit/core",
      "@composable-vite-pwa/workbox-swkit/precaching",
      "@composable-vite-pwa/workbox-swkit/routing",
    },
    "rewrite": true,
    "workbox": "",
  }
`)
  })
})
