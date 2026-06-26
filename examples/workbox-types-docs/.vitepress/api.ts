// Build-time renderer: turns the per-package workbox-types TypeDoc JSON into the
// data + Markdown the VitePress site shows — a page per documented symbol,
// grouped by package then kind (vue-router / javadoc style). This is the
// "logic that goes to the docs package"; the example proves the JSON is consumable.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// One JSON per package (full public API — types AND runtime).
// Subpath keys must match the npm package's "exports" map.
const sources: Record<string, any> = {
  'workbox-swkit': require('@composable-vite-pwa/workbox-types/workbox-swkit'),
  'workbox-build': require('@composable-vite-pwa/workbox-types/workbox-build'),
  'workbox-window': require('@composable-vite-pwa/workbox-types/workbox-window'),
  'workbox-cli': require('@composable-vite-pwa/workbox-types/workbox-cli'),
  'unplugin-pwa': require('@composable-vite-pwa/workbox-types/unplugin-pwa'),
}

// TypeDoc ReflectionKind numbers
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
const DOCUMENTED = new Set([8, 32, 64, 128, 256, 2097152]) // top-level pages
const CONTAINER = new Set([1, 2, 4]) // Project, Module, Namespace — recurse into these
const KIND_ORDER = ['Class', 'Function', 'Interface', 'Type Alias', 'Enumeration', 'Variable']

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
  /** Top-level package name (workbox-swkit, workbox-build, workbox-window, pwa-unplugin) */
  pkg: string
  /** Subpackage module path (e.g. "" for root, "background-sync", "build/vite") */
  module: string
  /** Display label e.g. "swkit", "swkit/background-sync" */
  label: string
  /** URL-safe slug for the package page */
  slug: string
  /** Symbols belonging to this package */
  symbols: ApiSymbol[]
}

// lowercase + sanitize: VitePress lowercases routes, and names can
// collide case-insensitively or carry odd chars.
function slugify(...parts: string[]): string {
  return parts.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// strip a trailing '/types' so a subpackage's runtime + types group together
function prettyModule(name: string): string {
  return name.replace(/\/types$/, '') || name
}

// Treat standalone "index" and "types" modules as root-level (they represent
// the package's main entry point and top-level types).
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
      let slug = slugify(pkg, actualMod, c.name)
      let i = 2
      while (slugs.has(slug)) slug = `${slug}-${i++}`
      slugs.add(slug)
      out.push({ pkg, module: actualMod, name: c.name, kind: c.kind, kindLabel: KIND[c.kind] ?? 'Type', slug, reflection: c })
    }
    else if (CONTAINER.has(c.kind)) {
      // a Module (kind 2) names the subpackage; namespaces keep the current one
      const newMod = c.kind === 2 ? prettyModule(c.name) : mod
      collect(c, pkg, newMod, out, ids, slugs)
    }
  }
}

export function getSymbols(): ApiSymbol[] {
  const out: ApiSymbol[] = []
  const slugs = new Set<string>() // global: filenames must be unique across packages
  for (const [pkg, root] of Object.entries(sources)) {
    // ids are numbered per-JSON, so dedup them per-package (not globally)
    collect(root, pkg, '', out, new Set<number>(), slugs)
  }
  return out.sort((a, b) =>
    a.pkg.localeCompare(b.pkg) || a.module.localeCompare(b.module)
    || a.kindLabel.localeCompare(b.kindLabel) || a.name.localeCompare(b.name))
}

/**
 * Group symbols into packages (JavaDoc-style).
 * Each unique (pkg, module) pair = one "package" with its own summary page.
 * Root-level (module === "") symbols belong to the bare package.
 * Packages with no root-level symbols still get a synthetic root entry so
 * that every top-level package has an index page showing its subpackages.
 */
export function getPackages(): PackageGroup[] {
  const map = new Map<string, PackageGroup>()
  for (const s of getSymbols()) {
    const key = `${s.pkg}/${s.module}`
    if (!map.has(key)) {
      const label = s.module ? `${s.pkg}/${s.module}` : s.pkg
      map.set(key, {
        pkg: s.pkg,
        module: s.module,
        label,
        slug: slugify(s.pkg, s.module || 'index'),
        symbols: [],
      })
    }
    map.get(key)!.symbols.push(s)
  }

  // Ensure every top-level package has a root index page, even if empty
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

  // Sort: root (module="") first, then shallow paths first, then alphabetically
  return [...map.values()].sort((a, b) => {
    if (a.pkg !== b.pkg)
      return a.pkg.localeCompare(b.pkg)
    // root module first
    if (a.module === '' && b.module !== '')
      return -1
    if (a.module !== '' && b.module === '')
      return 1
    // shallower (fewer slashes) first
    const aDepth = (a.module.match(/\//g) ?? []).length
    const bDepth = (b.module.match(/\//g) ?? []).length
    if (aDepth !== bDepth)
      return aDepth - bDepth
    return a.module.localeCompare(b.module)
  })
}

/**
 * Build a JavaDoc-style sidebar tree.
 * First level = top-level packages (swkit, build, window, unplugin).
 * Second level = subpackages (background-sync, core, build/vite, config, ...).
 * Third level = individual symbols.
 *
 * The root module (module === "") is NOT shown as a separate subpackage item
 * because the top-level link already points to the package index page.
 */
export function sidebar() {
  const packages = getPackages()

  // Group packages by top-level name
  const topLevel = new Map<string, PackageGroup[]>()
  for (const p of packages) {
    if (!topLevel.has(p.pkg))
      topLevel.set(p.pkg, [])
    topLevel.get(p.pkg)!.push(p)
  }

  // const link = (s: ApiSymbol) => ({ text: s.name, link: `/api/symbols/${s.slug}` })

  return [...topLevel.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkgName, subPackages]) => ({
      text: pkgName,
      link: `/api/packages/${slugify(pkgName, 'index')}`,
      collapsed: true,
      // Exclude root (module="") from subpackage items — the top-level link
      // already goes to the root index page. Only show non-root subpackages.
      items: subPackages
        .filter(sp => sp.module !== '')
        .map(sp => ({
          text: sp.module,
          link: `/api/packages/${sp.slug}`,
          collapsed: true,
          // items: sp.symbols
          //   .sort((a, b) => a.kindLabel.localeCompare(b.kindLabel) || a.name.localeCompare(b.name))
          //   .map(link),
        })),
    }))
}

// ---- package page rendering ----

/** Render a package summary page (lists all symbols in the package). */
export function renderPackagePage(pkg: PackageGroup): string {
  const out: string[] = []
  out.push(`# Package ${pkg.label}`, '')
  out.push(`<Badge type="info" text="Package" />`, '')
  out.push(`**Declaration:** \`${pkg.label}\``, '')

  if (pkg.symbols.length === 0) {
    // Root package with no direct symbols — list subpackages instead
    const allPkgs = getPackages()
    const children = allPkgs.filter(p => p.pkg === pkg.pkg && p.module !== '')
    if (children.length > 0) {
      out.push('', '## Subpackages', '')
      for (const child of children) {
        out.push(`- [${child.module}](/api/packages/${child.slug}) - ${child.symbols.length} symbol(s)`)
      }
      out.push('')
    }
    return out.join('\n')
  }

  // Group symbols by kind (mirrors JavaDoc order)
  const byKind = new Map<string, ApiSymbol[]>()
  for (const s of pkg.symbols) {
    if (!byKind.has(s.kindLabel))
      byKind.set(s.kindLabel, [])
    byKind.get(s.kindLabel)!.push(s)
  }

  for (const kind of KIND_ORDER) {
    const items = byKind.get(kind)
    if (!items?.length)
      continue
    out.push(`## ${kind} Summary`, '')

    const kindLink = (s: ApiSymbol) => `[${s.name}](/api/symbols/${s.slug})`
    const desc = (s: ApiSymbol) => {
      const d = renderCommentShort(s.reflection.comment)
      return d ? ` ${d}` : ''
    }

    if (kind === 'Enumeration' || kind === 'Interface' || kind === 'Class') {
      // Table: type, description
      out.push('| Type | Description |')
      out.push('| :--- | :--- |')
      for (const s of items) out.push(`| ${kindLink(s)} | ${desc(s)} |`)
    }
    else {
      // List for functions, type aliases, variables
      for (const s of items) out.push(`- ${kindLink(s)}${desc(s)}`)
    }
    out.push('')
  }

  out.push('')
  return out.join('\n')
}

// ---- symbol page rendering ----

function renderComment(comment: any): string {
  if (!comment?.summary)
    return ''
  return comment.summary.map((p: any) => p.text ?? '').join('').trim()
}

function renderCommentShort(comment: any): string {
  const full = renderComment(comment)
  if (!full)
    return ''
  // Take only first paragraph/sentence for summary tables; strip line breaks
  const firstPara = full.split(/\n\s*\n/)[0]
  return firstPara.replace(/\s*\n\s*/g, ' ').trim()
}

function renderType(t: any): string {
  if (!t)
    return 'unknown'
  switch (t.type) {
    case 'intrinsic': return t.name
    case 'reference': {
      const args = t.typeArguments?.length ? `<${t.typeArguments.map(renderType).join(', ')}>` : ''
      return `${t.name}${args}`
    }
    case 'literal': return typeof t.value === 'string' ? `"${t.value}"` : String(t.value)
    case 'union': return t.types.map(renderType).join(' | ')
    case 'intersection': return t.types.map(renderType).join(' & ')
    case 'array': return `${renderType(t.elementType)}[]`
    case 'reflection': return renderReflection(t.declaration)
    case 'tuple': return `[${(t.elements ?? []).map(renderType).join(', ')}]`
    case 'templateLiteral': return 'string'
    case 'indexedAccess': return `${renderType(t.objectType)}[${renderType(t.indexType)}]`
    case 'typeOperator': return `${t.operator} ${renderType(t.target)}`
    case 'query': return `typeof ${renderType(t.queryType)}`
    case 'predicate': return 'boolean'
    case 'mapped': return 'object'
    case 'conditional': return renderType(t.checkType)
    default: return t.name ?? t.type ?? 'unknown'
  }
}

function renderReflection(decl: any): string {
  if (decl?.signatures?.length) {
    const sig = decl.signatures[0]
    const params = (sig.parameters ?? []).map((p: any) => `${p.name}: ${renderType(p.type)}`).join(', ')
    return `(${params}) => ${renderType(sig.type)}`
  }
  if (decl?.children?.length)
    return `{ ${decl.children.map((c: any) => `${c.name}${c.flags?.isOptional ? '?' : ''}: ${renderType(c.type)}`).join('; ')} }`
  return 'object'
}

function getDefault(comment: any): string | null {
  const tag = comment?.blockTags?.find((t: any) => t.tag === '@default')
  if (!tag)
    return null
  return tag.content.map((c: any) => c.text ?? '').join('').replace(/```\w*\n?/g, '').replace(/```/g, '').trim()
}

function esc(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

function sig(name: string, s: any): string {
  const params = (s?.parameters ?? [])
    .map((p: any) => `${p.name}${p.flags?.isOptional ? '?' : ''}: ${renderType(p.type)}`)
    .join(', ')
  return `${name}(${params}): ${renderType(s?.type)}`
}

function pkgLabel(s: ApiSymbol): string {
  return s.module ? `${s.pkg}/${s.module}` : s.pkg
}

function propsTable(children: any[], out: string[]) {
  const props = children.filter(c => c.kind === 1024)
  if (!props.length)
    return
  out.push('## Properties', '', '| Property | Type | Default | Description |', '| :--- | :--- | :--- | :--- |')
  for (const p of props) {
    const opt = p.flags?.isOptional ? '?' : ''
    const def = getDefault(p.comment)
    out.push(`| \`${p.name}${opt}\` | \`${esc(renderType(p.type))}\` | ${def ? `\`${esc(def)}\`` : ''} | ${esc(renderComment(p.comment))} |`)
  }
  out.push('')
}

export function renderPage(s: ApiSymbol): string {
  const r = s.reflection
  const out: string[] = []
  out.push(`# ${s.name}`, '')
  out.push(`<Badge type="tip" text="${s.kindLabel}" /> <Badge type="info" text="${pkgLabel(s)}" />`, '')

  const desc = renderComment(r.comment)
  if (desc)
    out.push(desc, '')

  switch (s.kind) {
    case 2097152: // Type Alias
      out.push('```ts', `type ${s.name} = ${renderType(r.type)}`, '```')
      break
    case 32: // Variable
      out.push('```ts', `const ${s.name}: ${renderType(r.type)}`, '```')
      break
    case 256: // Interface
      propsTable(r.children ?? [], out)
      break
    case 8: { // Enum
      const members = (r.children ?? []).filter((c: any) => c.kind === 16)
      if (members.length) {
        out.push('## Members', '', '| Member | Value |', '| :--- | :--- |')
        for (const m of members) out.push(`| \`${m.name}\` | \`${m.type?.value ?? ''}\` |`)
        out.push('')
      }
      break
    }
    case 64: { // Function
      for (const s2 of r.signatures ?? []) {
        out.push('```ts', sig(s.name, s2), '```', '')
        const sd = renderComment(s2.comment)
        if (sd)
          out.push(sd, '')
        const ps = (s2.parameters ?? []).filter((p: any) => p.comment)
        if (ps.length) {
          out.push('**Parameters**', '')
          for (const p of ps) out.push(`- \`${p.name}\` - ${esc(renderComment(p.comment))}`)
          out.push('')
        }
      }
      break
    }
    case 128: { // Class
      propsTable(r.children ?? [], out)
      const methods = (r.children ?? []).filter((c: any) => c.kind === 2048)
      if (methods.length) {
        out.push('## Methods', '')
        for (const m of methods) {
          out.push(`### ${m.name}()`, '', '```ts', sig(m.name, m.signatures?.[0]), '```', '')
          const md = renderComment(m.signatures?.[0]?.comment ?? m.comment)
          if (md)
            out.push(md, '')
        }
      }
      break
    }
  }
  return out.join('\n')
}

// serializable list for the API index page (via .data loader); `pkg` is the
// fully-qualified package so the index groups the same way the sidebar nests
export function symbolIndex() {
  return getSymbols().map(s => ({ name: s.name, kind: s.kindLabel, pkg: pkgLabel(s), slug: s.slug }))
}
