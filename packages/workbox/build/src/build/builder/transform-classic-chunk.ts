import type {
  ClassicRegionReplacement,
  CustomChunksInfo,
} from './bundler-types'
import MagicString from 'magic-string'
import { restoreClassicGenerateSWRegions } from './utils'

const asRegexp = /\s+as\s+/

/**
 * GLOBAL TRANSFORMATION: ES6 to Classic (let/const to var).
 *
 * Since Rolldown/Vite only supports ES2015+ targets, we must manually
 * transform variable declarations for classic Service Workers to avoid
 * syntax errors on re-evaluation (Redeclaration Error).
 *
 * Replaced with Rolldown output `topLevelVar` enabled when using Rolldown:
 * - [vite 8 enables this flag](https://github.com/vitejs/vite/blob/main/packages/vite/src/node/build.ts#L774)
 * - check prepare-rolldown-output-options.ts module
 */
/* function replaceLetConstWithVar(magicString: MagicString) {
  const currentCode = magicString.original
  const varRegex = /\b(?:const|let)(?=\s+[_$a-zA-Z])/g
  let varMatch: RegExpExecArray | null = null

  // eslint-disable-next-line no-cond-assign
  while ((varMatch = varRegex.exec(currentCode)) !== null) {
    const start = varMatch.index
    const end = start + varMatch[0].length
    // Overwrite keeping the source map positions intact
    magicString.overwrite(start, end, 'var')
  }
} */

/**
 * Replace `import {} from '<chunk-name>-<hash>.js'` with the corresponding `self.workbox.<chunk-name>`
 */
function replaceImportsWithGlobalVars(
  magicString: MagicString,
  code: string,
  importName: string,
  customChunksInfo: CustomChunksInfo,
) {
  let match: RegExpExecArray | null = null
  let varDeclaration: string

  const importRegex = new RegExp(
    `import\\s+\\{([^}]+)\\}\\s+from\\s+['"]\\.\\/${importName}['"]`,
    'g',
  )

  // eslint-disable-next-line no-cond-assign
  while ((match = importRegex.exec(code)) !== null) {
    const [fullMatch, imports] = match

    const cleanImports = imports.split(',').map((i) => {
      const parts = i.trim().split(/\s+as\s+/)
      return parts.length > 1 ? parts[1].trim() : parts[0].trim()
    }).join(', ')

    let chunkName = customChunksInfo.importedFileChunks.get(importName)
    if (!chunkName) {
      throw new Error(`Import ${importName} not found.`)
    }
    chunkName = customChunksInfo.customChunkNames.get(chunkName)
    if (!chunkName) {
      throw new Error(`Import ${importName} not found.`)
    }
    varDeclaration = `self.workbox.${chunkName}`

    magicString.overwrite(
      match.index,
      match.index + fullMatch.length,
      `var { ${cleanImports} } = ${varDeclaration}`,
    )
  }
}

type ChunkNameType = 'sw' | string

export async function transformClassicChunk(
  name: ChunkNameType,
  code: string,
  generateSW: boolean,
  region: ClassicRegionReplacement,
  customChunksInfo: CustomChunksInfo,
) {
  const magicString = new MagicString(code)
  if (name === 'sw') {
    const importsScripts = customChunksInfo.mappedChunkImports.get('sw')
    if (importsScripts) {
      magicString.prepend(`importScripts(${importsScripts.map(n => `"./${n}"`).join(',')});\n`)
      for (const importName of importsScripts) {
        replaceImportsWithGlobalVars(
          magicString,
          code,
          importName,
          customChunksInfo,
        )
      }
    }

    // replace const/let with var: rolldown only supports ES6
    // replaceLetConstWithVar(magicString)
    // replace regions with temp SW name
    if (generateSW) {
      restoreClassicGenerateSWRegions(region, magicString)
    }

    return magicString
  }

  // 1. wrap content, beware: search for sourcemap to keep it outside the iife wrapper
  const mapRegex = /\/\/# sourceMappingURL=.*/
  const mapMatch = code.match(mapRegex)
  let codeWithoutMap = code

  if (mapMatch) {
    codeWithoutMap = code.replace(mapRegex, '')
    magicString.remove(mapMatch.index!, code.length)
  }

  magicString.prepend('(function() {\n')

  // should have only 1 export => we're inlining everything on each chunk, doesn't matter if using barrel or custom chunks
  const exportRegex = /export\s*\{([^}]+)\};?/g
  let match: RegExpExecArray | null = null
  const useName = customChunksInfo.customChunkNames.get(name)
  if (!useName) {
    throw new Error(`${name} chunk not found.`)
  }
  let i = 0
  // eslint-disable-next-line no-cond-assign
  while ((match = exportRegex.exec(codeWithoutMap)) !== null) {
    if (i > 0) {
      throw new Error(`${name} chunk has more than 1 export, which is not supported in classic mode.`)
    }
    const [fullMatch, content] = match
    const members = content.split(',').map(e => e.trim().split(asRegexp)[0].trim()).join(', ')

    // replace the export with the assigment
    const replacement = `\nself.workbox = self.workbox || {};\nself.workbox.${useName} = { ${members} };`
    magicString.overwrite(
      match.index,
      match.index + fullMatch.length,
      replacement,
    )
    i++
  }

  /* const imports = customChunksInfo.mappedChunkImports.get(name)
  if (imports) {
    for (const importName of imports) {
      replaceImportsWithGlobalVars(
        magicString,
        code,
        importName,
        customChunksInfo,
      )
    }
  } */

  // Transform const/let to var inside the Workbox chunk to avoid Redeclaration Errors
  // in classic Service Workers when the script is re-evaluated.
  // replaceLetConstWithVar(magicString)

  magicString.append('\n})();')

  // 2. there is a sourcemap, add it back outside the IIFE scope
  if (mapMatch) {
    magicString.append(`\n${mapMatch[0]}`)
  }

  return magicString
}
