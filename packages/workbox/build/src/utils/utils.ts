import type { GlobPartial, RequiredSWDestPartial } from '../types'
import path from 'node:path'

export function prepareGlobIgnores(
  options: GlobPartial & RequiredSWDestPartial,
  sourcemap: boolean,
): {
  sw: string
  swTemp: string
  classic: string
  classicTemp: string
  esm: string
  esmTemp: string
} {
  const entry = options.swDest.replace('.js', '.temp.js')
  const parts = options.swDest.split('/')
  const fileName = parts.pop()!
  const p = parts.join('/')

  const classic = `${p ? `${p}/` : ''}classic-${fileName}`
  const classicTemp = `${p ? `${p}/` : ''}classic-${fileName.replace('.js', '.temp.js')}`
  const esm = `${p ? `${p}/` : ''}esm-${fileName}`
  const esmTemp = `${p ? `${p}/` : ''}esm-${fileName.replace('.js', '.temp.js')}`

  options.globIgnores ??= []
  options.globIgnores.push(options.swDest)
  options.globIgnores.push(classic)
  options.globIgnores.push(esm)
  options.globIgnores.push('**/workbox-*.js')
  // add temp sw
  options.globIgnores.push(entry)
  options.globIgnores.push(classicTemp)
  options.globIgnores.push(esmTemp)
  if (sourcemap) {
    options.globIgnores.push(`${options.swDest}.map`)
    options.globIgnores.push(`${classic}.map`)
    options.globIgnores.push(`${esm}.map`)
    options.globIgnores.push('**/workbox-*.js.map')
    // add temp sw map
    options.globIgnores.push(`${entry}.map`)
  }

  return {
    sw: options.swDest,
    swTemp: entry,
    classic,
    classicTemp,
    esm,
    esmTemp,
  }
}

export function resolveSWNamesAndGlobIgnores(
  options: GlobPartial & RequiredSWDestPartial,
  swSrc: string,
  generateSW: boolean,
) {
  const newSWSrc = generateSW ? options.swDest.replace(/\.js$/, '-temp.js') : swSrc
  const swChunkName = generateSW
    ? path.basename(newSWSrc, '.js')
    : path.basename(swSrc.replace(/\.([mc])?[jt]sx?$/, '.js'), '.js')
  const swDestBasename = path.basename(options.swDest)
  const classicSWDest = options.swDest.replace(swDestBasename, `classic-${swDestBasename}`)
  const moduleSWDest = options.swDest.replace(swDestBasename, `module-${swDestBasename}`)

  const classicSWSrc = generateSW ? newSWSrc.replace(/-temp\.js$/, '-classic-temp.js') : undefined
  const classicSWChunkName = classicSWSrc ? path.basename(classicSWSrc, '.js') : undefined
  const moduleSWSrc = generateSW ? newSWSrc.replace(/-temp\.js$/, '-module-temp.js') : undefined
  const moduleSWChunkName = moduleSWSrc ? path.basename(moduleSWSrc, '.js') : undefined

  options.globIgnores ??= []
  options.globIgnores.push(swSrc)
  options.globIgnores.push('**/*-classic-temp.js')
  options.globIgnores.push('**/*-module-temp.js')
  options.globIgnores.push(options.swDest)
  options.globIgnores.push(`${options.swDest}.map`)
  options.globIgnores.push(classicSWDest)
  options.globIgnores.push(`${classicSWDest}.map`)
  options.globIgnores.push(moduleSWDest)
  options.globIgnores.push(`${moduleSWDest}.map`)
  options.globIgnores.push('**/workbox-*.js')
  options.globIgnores.push('**/workbox-*.js.map')

  return {
    swSrc: newSWSrc,
    swChunkName,
    classicSWSrc,
    classicSWChunkName,
    moduleSWSrc,
    moduleSWChunkName,
    swDest: options.swDest,
    classicSWDest,
    moduleSWDest,
  }
}

export function deepMergeObject(magicast: any, object: any) {
  if (typeof object === 'object' && object !== null) {
    for (const key in object) {
      const magicastValue = magicast[key]
      const objectValue = object[key]

      // Check for identity to prevent infinite recursion
      if (magicastValue === objectValue) {
        continue
      }

      if (
        typeof magicastValue === 'object'
        && magicastValue !== null
        && typeof objectValue === 'object'
        && objectValue !== null
      ) {
        deepMergeObject(magicastValue, objectValue)
      }
      else {
        magicast[key] = objectValue
      }
    }
  }
}
