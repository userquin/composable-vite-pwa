// Build-time renderer: turns the per-package workbox-types TypeDoc JSON into the
// data + Markdown the VitePress site shows — a page per documented symbol,
// grouped by package then kind (vue-router / javadoc style). This is the
// "logic that goes to the docs package"; the example proves the JSON is consumable.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// One JSON per package (full public API — types AND runtime).
const sources: Record<string, any> = {
  swkit: require('@composable-vite-pwa/workbox-types/swkit'),
  build: require('@composable-vite-pwa/workbox-types/build'),
  window: require('@composable-vite-pwa/workbox-types/window'),
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

// strip a trailing '/types' so a subpackage's runtime + types group together
function prettyModule(name: string): string {
  return name.replace(/\/types$/, '') || name
}

// fully-qualified package name (JavaDoc style): the npm package short-name plus
// its public subpath, e.g. `swkit/core`, `build/build/vite`, `window`. The root
// barrel (`index`) and root `types` modules ARE the package itself, so they
// collapse to the bare package name rather than showing as fake subpackages.
function pkgLabel(s: ApiSymbol): string {
  const mod = s.module === 'index' || s.module === 'types' ? '' : s.module
  return mod ? `${s.pkg}/${mod}` : s.pkg
}

function collect(node: any, pkg: string, mod: string, out: ApiSymbol[], ids: Set<number>, slugs: Set<string>) {
  for (const c of node.children ?? []) {
    if (DOCUMENTED.has(c.kind)) {
      if (ids.has(c.id))
        continue
      ids.add(c.id)
      // lowercase + sanitize: VitePress lowercases routes, and symbol names can
      // collide case-insensitively (e.g. a `Strategy` class) or carry odd chars.
      const base = `${pkg}-${mod}-${c.name}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      let slug = base
      let i = 2
      while (slugs.has(slug)) slug = `${base}-${i++}`
      slugs.add(slug)
      out.push({ pkg, module: mod, name: c.name, kind: c.kind, kindLabel: KIND[c.kind] ?? 'Type', slug, reflection: c })
    }
    else if (CONTAINER.has(c.kind)) {
      // a Module (kind 2) names the subpackage; namespaces keep the current one
      collect(c, pkg, c.kind === 2 ? prettyModule(c.name) : mod, out, ids, slugs)
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

// ---- rendering helpers ----
function renderComment(comment: any): string {
  if (!comment?.summary)
    return ''
  return comment.summary.map((p: any) => p.text ?? '').join('').trim()
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
          for (const p of ps) out.push(`- \`${p.name}\` — ${esc(renderComment(p.comment))}`)
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

// sidebar: a flat, alphabetically-sorted list of fully-qualified packages
// (JavaDoc style — one entry per package; nested subpackages are siblings, not a
// tree: build, build/build/vite, build/config, swkit/core, window, ...). Each
// package expands to its documented symbols.
export function sidebar() {
  const byPkg = new Map<string, ApiSymbol[]>()
  for (const s of getSymbols()) {
    const key = pkgLabel(s)
    if (!byPkg.has(key))
      byPkg.set(key, [])
    byPkg.get(key)!.push(s)
  }
  const link = (s: ApiSymbol) => ({ text: s.name, link: `/api/symbols/${s.slug}` })
  return [...byPkg.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pkg, items]) => ({ text: pkg, collapsed: true, items: items.map(link) }))
}

// serializable list for the API index page (via .data loader); `pkg` is the
// fully-qualified package so the index groups the same way the sidebar nests
export function symbolIndex() {
  return getSymbols().map(s => ({ name: s.name, kind: s.kindLabel, pkg: pkgLabel(s), slug: s.slug }))
}
