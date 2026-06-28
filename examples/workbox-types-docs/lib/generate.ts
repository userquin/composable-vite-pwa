import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const apiDir = resolve(import.meta.dirname, '../../../packages/workbox/types/api')

const sources: Record<string, any> = {
  'workbox-swkit': JSON.parse(readFileSync(resolve(apiDir, 'workbox-swkit.json'), 'utf-8')),
  'workbox-build': JSON.parse(readFileSync(resolve(apiDir, 'workbox-build.json'), 'utf-8')),
  'workbox-window': JSON.parse(readFileSync(resolve(apiDir, 'workbox-window.json'), 'utf-8')),
  'workbox-cli': JSON.parse(readFileSync(resolve(apiDir, 'workbox-cli.json'), 'utf-8')),
  'unplugin-pwa': JSON.parse(readFileSync(resolve(apiDir, 'unplugin-pwa.json'), 'utf-8')),
}

const KIND: Record<number, string> = {
  8: 'Enumeration',
  16: 'Enum Member',
  32: 'Variable',
  64: 'Function',
  128: 'Class',
  256: 'Interface',
  512: 'Constructor',
  1024: 'Property',
  2048: 'Method',
  2097152: 'Type Alias',
}
const DOCUMENTED = new Set([8, 32, 64, 128, 256, 2097152])
const CONTAINER = new Set([1, 2, 4])
export const KIND_ORDER = ['Class', 'Function', 'Interface', 'Type Alias', 'Enumeration', 'Variable']

export interface ApiSymbol {
  pkg: string
  module: string
  name: string
  kind: number
  kindLabel: string
  slug: string
  reflection: any
}

export interface PackageGroup {
  pkg: string
  module: string
  label: string
  slug: string
  symbols: ApiSymbol[]
}

// Used for package-level slugs (e.g. sidebar links, package page filenames).
export function slugify(...parts: string[]): string {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// Used for symbol page paths: pkg/[module/]name so the URL hierarchy matches
// the package structure (e.g. workbox-swkit/cacheable-response/cacheableresponseplugin).
function symbolPath(pkg: string, mod: string, name: string): string {
  const namePart = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return mod ? `${pkg}/${mod}/${namePart}` : `${pkg}/${namePart}`
}

function prettyModule(name: string): string {
  return name.replace(/\/types$/, '') || name
}

function isRootModule(name: string): boolean {
  return name === '' || name === 'index' || name === 'types'
}

function collect(node: any, pkg: string, mod: string, out: ApiSymbol[], ids: Set<number>, slugs: Set<string>) {
  for (const c of node.children ?? []) {
    if (DOCUMENTED.has(c.kind)) {
      if (ids.has(c.id))
        continue
      ids.add(c.id)
      const actualMod = isRootModule(mod) ? '' : mod
      let slug = symbolPath(pkg, actualMod, c.name)
      let i = 2
      while (slugs.has(slug)) slug = `${slug}-${i++}`
      slugs.add(slug)
      out.push({ pkg, module: actualMod, name: c.name, kind: c.kind, kindLabel: KIND[c.kind] ?? 'Type', slug, reflection: c })
    }
    else if (CONTAINER.has(c.kind)) {
      const newMod = c.kind === 2 ? prettyModule(c.name) : mod
      collect(c, pkg, newMod, out, ids, slugs)
    }
  }
}

export function getSymbols(): ApiSymbol[] {
  const out: ApiSymbol[] = []
  const slugs = new Set<string>()
  for (const [pkg, root] of Object.entries(sources)) {
    collect(root, pkg, '', out, new Set<number>(), slugs)
  }
  return out.sort((a, b) =>
    a.pkg.localeCompare(b.pkg) || a.module.localeCompare(b.module)
    || a.kindLabel.localeCompare(b.kindLabel) || a.name.localeCompare(b.name),
  )
}

export function getPackages(): PackageGroup[] {
  const map = new Map<string, PackageGroup>()
  for (const s of getSymbols()) {
    const key = `${s.pkg}/${s.module}`
    if (!map.has(key)) {
      map.set(key, {
        pkg: s.pkg,
        module: s.module,
        label: s.module ? `${s.pkg}/${s.module}` : s.pkg,
        slug: slugify(s.pkg, s.module || 'index'),
        symbols: [],
      })
    }
    map.get(key)!.symbols.push(s)
  }
  for (const pkg of Object.keys(sources)) {
    const key = `${pkg}/`
    if (!map.has(key)) {
      map.set(key, {
        pkg,
        module: '',
        label: pkg,
        slug: slugify(pkg, 'index'),
        symbols: [],
      })
    }
  }
  return [...map.values()].sort((a, b) => {
    if (a.pkg !== b.pkg)
      return a.pkg.localeCompare(b.pkg)
    if (a.module === '' && b.module !== '')
      return -1
    if (a.module !== '' && b.module === '')
      return 1
    const aDepth = (a.module.match(/\//g) ?? []).length
    const bDepth = (b.module.match(/\//g) ?? []).length
    if (aDepth !== bDepth)
      return aDepth - bDepth
    return a.module.localeCompare(b.module)
  })
}

export function sidebar() {
  const packages = getPackages()
  const topLevel = new Map<string, PackageGroup[]>()
  for (const p of packages) {
    if (!topLevel.has(p.pkg))
      topLevel.set(p.pkg, [])
    topLevel.get(p.pkg)!.push(p)
  }
  return [...topLevel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkgName, subPackages]) => ({
      text: pkgName,
      link: `/api/packages/${slugify(pkgName, 'index')}`,
      collapsed: true,
      items: subPackages
        .filter(sp => sp.module !== '')
        .map(sp => ({
          text: sp.module,
          link: `/api/packages/${sp.slug}`,
          collapsed: true,
        })),
    }))
}
