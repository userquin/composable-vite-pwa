import type { Program, Statement } from '@babel/types'
import type { ProxifiedModule } from 'magicast'
import fs from 'node:fs/promises'
import { generateCode, parseModule } from 'magicast'
import { camelize } from './prepare-sw-code'
import { stripTypescriptTypes } from './strip-typescript-types'

export interface ServiceWorkerInfo {
  rewrite: boolean
  barrel: boolean
  swCode: string
  workbox: string
}

export function parseServiceWorkerFile(
  swPath: string,
  workboxImportScriptName: string,
): Promise<ServiceWorkerInfo> {
  return sanitizeFileCode(swPath).then(swProgram => prepareSplit(swProgram, workboxImportScriptName))
}

export function parseServiceWorkerCode(
  workboxImportScriptName: string,
  tsCode: boolean,
  swCode: string,
): Promise<ServiceWorkerInfo> {
  return sanitizeSWCode(tsCode, swCode).then(swProgram => prepareSplit(swProgram, workboxImportScriptName))
}

function prepareCode(
  swProgram: ProxifiedModule<Program>,
  data: ServiceWorkerInfo,
  swDestImportName: string,
  exports: Set<string>,
) {
  data.rewrite = true
  if (data.barrel) {
    data.workbox = `import * as swkit from "@composable-vite-pwa/workbox-swkit";
self.workbox=self.workbox||{};
self.workbox.swkit=swkit;
`
    exports.clear()
  }
  else {
    data.workbox = ''
    const entries = new Set<string>()
    for (const exp of exports) {
      const fromKey = camelize(exp.split('/').pop()!)
      // avoid duplicated entries
      if (entries.has(fromKey)) {
        continue
      }
      entries.add(fromKey)
      data.workbox += `import * as ${fromKey} from "${exp}";\n`
    }
    data.workbox += `self.workbox=self.workbox||{};
${Array.from(entries).map(e => `self.workbox.${e}=${e};`).join('\n')}
`
  }

  const program = swProgram.$ast as Program

  program.body = program.body.filter((node: Statement) => {
    if (node.type !== 'ImportDeclaration')
      return true

    const source = node.source.value
    const noswkit = !source.startsWith('@composable-vite-pwa/workbox-swkit')
    if (!noswkit) {
      console.log(source)
    }
    return noswkit
    // return !source.startsWith('@composable-vite-pwa/workbox-swkit')
  })

  data.swCode = `importScripts("./${swDestImportName}");
${generateCode(swProgram, {
  format: {
    tabWidth: 2,
    useTabs: false,
    quote: 'double',
    trailingComma: false,
    arrayBracketSpacing: false,
    objectCurlySpacing: false,
    arrowParensAlways: true,
    useSemi: true,
  },
}).code}   
`

  return data
}

function prepareSplit(
  swProgram: ProxifiedModule<Program>,
  workboxImportScriptName: string,
): ServiceWorkerInfo {
  const data: ServiceWorkerInfo = {
    rewrite: false,
    barrel: false,
    swCode: '',
    workbox: '',
  }

  if (!swProgram.imports.$items.length) {
    return data
  }

  const exports = new Set<string>()

  for (const item of swProgram.imports.$items) {
    if (item.from === '@composable-vite-pwa/workbox-swkit') {
      data.barrel = true
      exports.add(item.from)
      continue
    }
    if (item.from.startsWith('@composable-vite-pwa/workbox-swkit/')) {
      exports.add(item.from)
    }
  }

  return exports.size === 0
    ? data
    : prepareCode(
        swProgram,
        data,
        workboxImportScriptName,
        exports,
      )
}

async function sanitizeSWCode(tsCode: boolean, swCode: string): Promise<ProxifiedModule<Program>> {
  const swProgram = parseModule<Program>(swCode)

  if (!tsCode) {
    return swProgram
  }

  return await stripTypescriptTypes(generateCode(swProgram, {
    format: {
      tabWidth: 2,
      useTabs: false,
      quote: 'double',
      trailingComma: false,
      arrayBracketSpacing: false,
      objectCurlySpacing: false,
      arrowParensAlways: true,
      useSemi: true,
    },
  }).code).then((result) => {
    return result.transformed ? parseModule<Program>(result.code) : swProgram
  })
}
function sanitizeFileCode(swPath: string): Promise<ProxifiedModule<Program>> {
  const tsCode = /\.m?ts$/.test(swPath)
  return fs.readFile(swPath, 'utf-8').then(code => sanitizeSWCode(tsCode, code))
}
