import type { ImportItemInput } from 'magicast'
import type { GenerateSWOptions, GetManifestResult, SWType } from '../types'
import { builders, generateCode, parseExpression, parseModule } from 'magicast'
import serialize from 'serialize-javascript'
import { generateManifestEntries } from './generate-manifest-entries'

export interface ChunksInfo {
  swCode: string
  workbox?: string
}

export type ChunksInfoData<T extends SWType> = T extends 'classic'
  ? ChunksInfo
  : T extends 'module'
    ? ChunksInfo
    : {
        classic: ChunksInfo
        module: ChunksInfo
      }

export interface InternalGetManifestResult<T extends SWType> {
  manifestEntries: GetManifestResult
  chunks: ChunksInfoData<T>
}

export async function prepareSWCode<T extends SWType>(
  globDirectory: string,
  options: GenerateSWOptions<T>,
): Promise<InternalGetManifestResult<T>> {
  const manifestEntries = await generateManifestEntries(globDirectory, options)

  const chunks = options.swType === 'classic-and-module'
    ? {
        classic: {
          swCode: '',
        },
        module: {
          swCode: '',
        },
      } as ChunksInfoData<T>
    : {
        swCode: '',
      } as ChunksInfoData<T>

  prepareWorkboxRuntime(options, manifestEntries, chunks)

  return {
    manifestEntries,
    chunks,
  } as InternalGetManifestResult<T>
}

export function camelize(str: string): string {
  return str.replace(/-([a-z0-9])/g, g => g[1].toUpperCase())
}

function capitalize(s: string, sanitize = false): string {
  const value = s.charAt(0).toUpperCase() + s.slice(1)
  return sanitize ? value.replace(/['"]/g, '') : value
}

function getRuntimeCachingEntries<T extends SWType>(
  classic: boolean,
  workboxMap: Map<string, string>,
  options: GenerateSWOptions<T>,
): string[] {
  const entries: string[] = []
  if (!options.runtimeCaching) {
    return entries
  }

  const prefix = createNamePrefix(workboxMap, () => classic)

  for (const entry of options.runtimeCaching) {
    let handlerNode: any

    if (typeof entry.handler === 'string') {
      const strategyName = capitalize(entry.handler, true)

      const args = entry.options ? [parseExpression(serialize(entry.options, { unsafe: true }))] : undefined
      handlerNode = args && args.length > 0
        ? builders.newExpression(prefix(strategyName), ...args)
        : builders.newExpression(prefix(strategyName))
    }
    else {
      handlerNode = parseExpression(serialize(entry.handler, { unsafe: true }))
    }

    let urlPatternNode: any
    if (typeof entry.urlPattern === 'string') {
      urlPatternNode = entry.urlPattern
    }
    else if (entry.urlPattern instanceof RegExp) {
      urlPatternNode = builders.newExpression('RegExp', entry.urlPattern.source, entry.urlPattern.flags)
    }
    else {
      urlPatternNode = parseExpression(serialize(entry.urlPattern, { unsafe: true }))
    }

    const routeCallArgs: any[] = [urlPatternNode, handlerNode]

    if (entry.method) {
      routeCallArgs.push(entry.method)
    }

    const routeCallNode = builders.functionCall(
      prefix('registerRoute'),
      ...routeCallArgs,
    )

    entries.push(generateCode(routeCallNode).code)
  }

  return entries
}

function addImportMap(
  map: Map<string, string[]>,
  workboxMap: Map<string, string>,
  item: ImportItemInput,
) {
  const from = item.from
  let entries = map.get(from)
  if (!entries) {
    entries = []
    map.set(from, entries)
  }
  // classic only:
  const fromKey = camelize(from.split('/').pop()!)
  // self.workbox.xxx = xxx where xxx is the subpackage export name (import * as xxx from '.../xxx')
  workboxMap.set(from, fromKey)
  // precacheAndRoute comes from workbox-swkit/precaching => self.workbox.precaching.precacheAndRoute
  workboxMap.set(item.imported, fromKey)
  // esm: no action required here
  entries.push(item.imported)
}

function isDualBuild(chunksInfoData: ChunksInfoData<SWType>): chunksInfoData is ChunksInfoData<'classic-and-module'> {
  return 'classic' in chunksInfoData && 'module' in chunksInfoData
}

function createNamePrefix(workboxMap: Map<string, string>, classic: () => boolean) {
  return (name: string): string => {
    return classic() ? `workbox.${workboxMap.get(name)}.${name}` : name
  }
}

function internalPrepareSWCode<T extends SWType>(
  classic: boolean,
  workboxMap: Map<string, string>,
  options: GenerateSWOptions<T>,
  manifestEntries: GetManifestResult,
): string {
  const prefix = createNamePrefix(workboxMap, () => classic)

  const swCode: string[] = []

  if (options.navigationPreload) {
    swCode.push(`${prefix('enable')}();`)
  }

  if (options.cacheId) {
    const call = builders.functionCall(prefix('setCacheNameDetails'), { prefix: options.cacheId })
    swCode.push(generateCode(call).code)
  }

  if (options.skipWaiting) {
    swCode.push('self.skipWaiting();')
  }
  else {
    swCode.push(`self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});`)
  }

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
      ? builders.functionCall(prefix('precacheAndRoute'), manifestEntries.manifestEntries, precacheOptions)
      : builders.functionCall(prefix('precacheAndRoute'), manifestEntries.manifestEntries)

    swCode.push(generateCode(precacheAndRoute).code)
  }

  if (options.cleanupOutdatedCaches) {
    swCode.push(`${prefix('cleanupOutdatedCaches')}()`)
  }

  if (options.navigateFallback) {
    const handler = builders.functionCall(prefix('createHandlerBoundToURL'), options.navigateFallback)
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
      ? builders.newExpression(prefix('NavigationRoute'), handler, newOptions)
      : builders.newExpression(prefix('NavigationRoute'), handler)
    const registerRoute = builders.functionCall(prefix('registerRoute'), navigationRoute)
    swCode.push(generateCode(registerRoute).code)
  }

  if (options.runtimeCaching) {
    swCode.push(...getRuntimeCachingEntries(classic, workboxMap, options))
  }

  if (options.disableDevLogs) {
    swCode.push('self.__WB_DISABLE_DEV_LOGS = true;')
  }

  return swCode.join('\n')
}

function prepareWorkboxModule(
  classic: boolean,
  map: Map<string, string[]>,
  workboxMap: Map<string, string>,
  inline: boolean,
) {
  const module = parseModule('')
  let code: string
  if (classic) {
    code = ''
    for (const key of map.keys()) {
      code += `${code ? '\n' : ''}import * as ${workboxMap.get(key)} from "${key}";`
    }
  }
  else {
    for (const [key, imports] of map.entries()) {
      for (const imported of imports) {
        module.imports.$append({ from: key, imported })
      }
    }
    code = generateCode(module, { format: {
      tabWidth: 2,
      useTabs: false,
      quote: 'single',
      trailingComma: false,
      arrayBracketSpacing: false,
      objectCurlySpacing: false,
      arrowParensAlways: true,
      useSemi: true,
    } }).code
  }

  if (classic) {
    return `${code}
self.workbox=self.workbox||{};
${Array.from(map.keys()).map(k => `self.workbox.${workboxMap.get(k)} = ${workboxMap.get(k)};`).join('\n')}    
`
  }
  else {
    if (inline) {
      return code
    }
    const exports: string[] = []
    for (const [_, imports] of map.entries()) {
      for (const imported of imports) {
        exports.push(imported)
      }
    }
    return `${code}
    
export {${exports.join(', ')}}
`
  }
}

function prepareWorkboxRuntime<T extends SWType>(
  options: GenerateSWOptions<T>,
  manifestEntries: GetManifestResult,
  chunksInfoData: ChunksInfoData<T>,
) {
  const map = new Map<string, string[]>()
  const workboxMap = new Map<string, string>()
  const strategyImports = new Set<string>()
  if (options.runtimeCaching) {
    for (const entry of options.runtimeCaching) {
      if (typeof entry.handler === 'string') {
        strategyImports.add(capitalize(entry.handler))
      }
    }
  }

  if (manifestEntries.manifestEntries.length > 0) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'precacheAndRoute' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'precacheAndRoute' })
  }

  if (options.navigationPreload) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/navigation-preload', imported: 'enable' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/navigation-preload', imported: 'enable' })
  }

  if (options.cacheId) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/core', imported: 'setCacheNameDetails' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'setCacheNameDetails' })
  }

  if (options.skipWaiting) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/core', imported: 'skipWaiting' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'skipWaiting' })
  }
  if (options.clientsClaim) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/core', imported: 'clientsClaim' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/core', imported: 'clientsClaim' })
  }
  if (options.cleanupOutdatedCaches) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'cleanupOutdatedCaches' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'cleanupOutdatedCaches' })
  }

  const needsRegisterRoute = options.runtimeCaching?.length || options.navigateFallback
  if (needsRegisterRoute) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'registerRoute' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'registerRoute' })
  }

  if (options.navigateFallback) {
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'NavigationRoute' })
    addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'createHandlerBoundToURL' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/routing', imported: 'NavigationRoute' })
    // workboxModule.imports.$append({ from: '@composable-vite-pwa/workbox-swkit/precaching', imported: 'createHandlerBoundToURL' })
  }

  if (options.runtimeCaching?.length) {
    if (strategyImports.size > 0) {
      for (const strategyImport of strategyImports) {
        addImportMap(map, workboxMap, { from: '@composable-vite-pwa/workbox-swkit/strategies', imported: strategyImport })
        // swModule.imports.$append({
        //   from: '@composable-vite-pwa/workbox-swkit/strategies',
        //   imported: strategyImport,
        // })
      }
    }
  }

  const inlineWorkboxRuntime = options.inlineWorkboxRuntime === true

  if (isDualBuild(chunksInfoData)) {
    const workboxClassicCode = prepareWorkboxModule(true, map, workboxMap, inlineWorkboxRuntime)
    const swClassicCode = internalPrepareSWCode(true, workboxMap, options, manifestEntries)
    const workboxModuleCode = prepareWorkboxModule(false, map, workboxMap, inlineWorkboxRuntime)
    const swModuleCode = internalPrepareSWCode(false, workboxMap, options, manifestEntries)

    chunksInfoData.module.swCode = `${workboxModuleCode}\n${swModuleCode}`
    if (inlineWorkboxRuntime) {
      chunksInfoData.classic.swCode = `${workboxClassicCode}\n${swClassicCode}`
    }
    else {
      chunksInfoData.classic.workbox = workboxClassicCode
      chunksInfoData.classic.swCode = `importScripts("./workbox-classic.js");\n${swClassicCode}`
    }
  }
  else {
    const classic = options.swType === 'classic'
    const workboxCode = prepareWorkboxModule(classic, map, workboxMap, inlineWorkboxRuntime)
    const swCode = internalPrepareSWCode(classic, workboxMap, options, manifestEntries)
    if (inlineWorkboxRuntime || options.swType === 'module') {
      chunksInfoData.swCode = `${workboxCode}\n${swCode}`
    }
    else {
      chunksInfoData.workbox = workboxCode
      chunksInfoData.swCode = `importScripts("./workbox${options.classicWorkboxRuntimeCompatible ? '' : '-classic'}.js");\n${swCode}`
    }
  }
}
