import type { GenerateSWOptions, GetManifestResult, ManifestEntry } from '../types'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { compileFunction, createContext } from 'node:vm'
import { builders, generateCode, parseExpression, parseModule } from 'magicast'
import serialize from 'serialize-javascript'
import { glob } from 'tinyglobby'
import { migrateGlobsToPicomatch } from './migrate-globs-to-picomatch'

export async function prepareSWCode(
  options: GenerateSWOptions,
): Promise<string> {
  const swModule = parseModule('')

  const manifestEntries = await generateManifestEntries(options)

  const strategyImports = new Set<string>()
  if (options.runtimeCaching) {
    for (const entry of options.runtimeCaching) {
      if (typeof entry.handler === 'string') {
        strategyImports.add(capitalize(entry.handler))
      }
    }
  }

  if (manifestEntries.manifestEntries.length > 0) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'precacheAndRoute' })
  }

  if (options.navigationPreload) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/navigation-preload', imported: 'enable' })
  }

  if (options.cacheId) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'setCacheNameDetails' })
  }

  if (options.skipWaiting) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'skipWaiting' })
  }
  if (options.clientsClaim) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'clientsClaim' })
  }
  if (options.cleanupOutdatedCaches) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'cleanupOutdatedCaches' })
  }

  const needsRegisterRoute = options.runtimeCaching?.length || options.navigateFallback
  if (needsRegisterRoute) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'registerRoute' })
  }

  if (options.navigateFallback) {
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'NavigationRoute' })
    swModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'createHandlerBoundToURL' })
  }

  if (options.runtimeCaching?.length) {
    if (strategyImports.size > 0) {
      for (const strategyImport of strategyImports) {
        swModule.imports.$append({
          from: '@composable-vite-pwa/workbox-swkit/strategies',
          imported: strategyImport,
        })
      }
    }
  }

  // --- CONSTRUCCIÓN DEL CÓDIGO ---
  const swCode: string[] = []

  if (options.navigationPreload) {
    swCode.push('enable();')
  }

  if (options.cacheId) {
    const call = builders.functionCall('setCacheNameDetails', { prefix: options.cacheId })
    swCode.push(generateCode(call).code)
  }

  if (options.skipWaiting) {
    swCode.push('globalThis.skipWaiting();')
  }
  else {
    swCode.push(`self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    globalThis.skipWaiting();
  }
});`)
  }

  if (options.clientsClaim) {
    swCode.push('clientsClaim();')
  }

  console.log(manifestEntries.manifestEntries)

  if (manifestEntries.manifestEntries.length > 0) {
    const precacheOptions: any = {}
    if (options.directoryIndex) {
      precacheOptions.directoryIndex = options.directoryIndex
    }
    if (options.ignoreURLParametersMatching) {
      precacheOptions.ignoreURLParametersMatching = options.ignoreURLParametersMatching
    }
    if (options.cleanURLs) {
      precacheOptions.cleanURLs = options.cleanURLs
    }
    if (options.urlManipulation) {
      precacheOptions.urlManipulation = parseExpression(serialize(options.urlManipulation, { unsafe: true }))
    }

    const precacheAndRoute = Object.keys(precacheOptions).length > 0
      ? builders.functionCall('precacheAndRoute', manifestEntries.manifestEntries, precacheOptions)
      : builders.functionCall('precacheAndRoute', manifestEntries.manifestEntries)

    swCode.push(generateCode(precacheAndRoute).code)
  }

  if (options.cleanupOutdatedCaches) {
    swCode.push('cleanupOutdatedCaches();')
  }

  if (options.navigateFallback) {
    const handler = builders.functionCall('createHandlerBoundToURL', options.navigateFallback)
    let newOptions: any
    if (options.navigateFallbackAllowlist || options.navigateFallbackDenylist) {
      newOptions = {}
      if (options.navigateFallbackAllowlist) {
        newOptions.allowlist = options.navigateFallbackAllowlist
      }
      if (options.navigateFallbackDenylist) {
        newOptions.denylist = options.navigateFallbackDenylist
      }
    }
    const navigationRoute = newOptions
      ? builders.newExpression('NavigationRoute', handler, newOptions)
      : builders.newExpression('NavigationRoute', handler)
    const registerRoute = builders.functionCall('registerRoute', navigationRoute)
    swCode.push(generateCode(registerRoute).code)
  }

  if (options.runtimeCaching) {
    swCode.push(...getRuntimeCachingEntries(options, strategyImports))
  }

  if (options.disableDevLogs) {
    swCode.push('globalThis.__WB_DISABLE_DEV_LOGS = true;')
  }

  const importsCode = generateCode(swModule.imports).code
  const finalCode = `${importsCode}\n\n${swCode.join('\n')}`

  console.log('--- GENERATED SERVICE WORKER ---')
  console.log(finalCode)

  return finalCode
}

async function* hashManifestEntries(
  assets: string[],
  options: GenerateSWOptions,
): AsyncGenerator<ManifestEntry & { size: number }, undefined, void> {
  for (const asset of assets) {
    const filePath = resolve(options.globDirectory!, asset)
    const stats = await stat(filePath)
    const revision = createHash('md5').update(await readFile(filePath)).digest('hex')
    yield { url: asset, revision, size: stats.size }
  }
}

async function _executeManifestTransforms(
  manifestEntries: (ManifestEntry & { size: number })[],
  options: GenerateSWOptions,
): Promise<{ manifest: (ManifestEntry & { size: number })[], warnings: string[] }> {
  const runnerCode = `return (async (initialManifest) => {
const transforms = ${generateCode(options.manifestTransforms as any).code};
let currentManifest = initialManifest;
const warnings = [];
for (const transform of transforms) {
  const result = await transform(currentManifest);
  currentManifest = result.manifest;
  if (result.warnings) {
    warnings.push(...result.warnings);
  }
}
return { manifest: currentManifest, warnings };
})(initialManifest);
`

  const runner = compileFunction(
    runnerCode,
    ['initialManifest'],
    { parsingContext: createContext(globalThis) },
  ) as (initialManifest: (ManifestEntry & { size: number })[]) => Promise<{ manifest: (ManifestEntry & { size: number })[], warnings: string[] }>

  return await runner(manifestEntries)
}

async function generateManifestEntries(
  options: GenerateSWOptions,
): Promise<GetManifestResult> {
  if (!options.globDirectory) {
    return {
      count: 0,
      manifestEntries: [],
      size: 0,
      warnings: [],
    }
  }

  const globPatterns = options.globPatterns!
  const globIgnores = options.globIgnores!

  const { patterns, ignore } = migrateGlobsToPicomatch({
    globPatterns,
    globIgnores,
  })

  // Make sure we leave swDest out of the precache manifest.
  // todo: add swDest here to ignores

  // If we create an extra external runtime file, ignore that, too.
  // See https://rollupjs.org/guide/en/#outputchunkfilenames for naming.
  // todo: add glob here for 'workbox-*.js' here to ignores (when !options.inlineWorkboxRuntime)

  const assets = await glob(patterns, {
    cwd: options.globDirectory,
    ignore,
    onlyFiles: true,
    absolute: false,
    followSymbolicLinks: options.globFollow,
  })

  let manifestEntries: (ManifestEntry & { size: number })[] = []
  for await (const manifest of hashManifestEntries(assets, options)) {
    manifestEntries.push(manifest)
  }

  const warnings: string[] = []

  if (options.manifestTransforms) {
    for (const mt of options.manifestTransforms) {
      const result = await mt(manifestEntries, options)
      manifestEntries = result.manifest
      if (result.warnings) {
        warnings.push(...result.warnings)
      }
    }
  }

  const size = manifestEntries.reduce((acc, entry) => acc + entry.size, 0)
  const count = manifestEntries.length

  return {
    count,
    size,
    manifestEntries: manifestEntries.map(({ size, ...rest }) => rest),
    warnings,
  }
}

// Helper para capitalizar: NetworkFirst -> NetworkFirst
function capitalize(s: string, sanitize = false) {
  const value = s.charAt(0).toUpperCase() + s.slice(1)
  return sanitize ? value.replace(/['"]/g, '') : value
}

function getRuntimeCachingEntries(
  options: GenerateSWOptions,
  _strategyImports: Set<string>,
): string[] {
  const entries: string[] = []
  if (!options.runtimeCaching) {
    return entries
  }

  /* for (const entry of options.runtimeCaching) {
    let handlerNode: any

    if (typeof entry.handler === 'string') {
      const strategyName = capitalize(entry.handler, true)
      strategyImports.add(capitalize(strategyName, true))
      const args = entry.options?.$ast ? [entry.options] : undefined
      handlerNode = args && args.length > 0
        ? builders.newExpression(strategyName, ...args)
        : builders.newExpression(strategyName)
    }
    else {
      handlerNode = entry.handler
    }

    const routeCallNode = builders.functionCall(
      'registerRoute',
      entry.urlPattern,
      handlerNode,
    )

    entries.push(generateCode(routeCallNode).code)
  } */

  return entries
}
