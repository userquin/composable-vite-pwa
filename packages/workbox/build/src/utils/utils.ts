import type { GlobPartial, RequiredSWDestPartial } from '../types'

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
