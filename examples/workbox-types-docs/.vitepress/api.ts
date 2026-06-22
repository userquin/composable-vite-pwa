// Build-time renderer: turns the published workbox-types TypeDoc JSON metadata
// into the data + Markdown the VitePress site shows. This is the "logic that
// goes to the docs package" — the example just proves the metadata is consumable.
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
// `.` export of @composable-vite-pwa/workbox-types resolves to api/metadata.json
const metadata: any = require('@composable-vite-pwa/workbox-types')

// TypeDoc ReflectionKind numbers we care about
const KIND: Record<number, string> = {
  4: 'Namespace',
  8: 'Enumeration',
  32: 'Variable',
  64: 'Function',
  128: 'Class',
  256: 'Interface',
  1024: 'Property',
  2097152: 'Type Alias',
}
const DOCUMENTED = new Set([256, 2097152, 8]) // Interface, Type Alias, Enum

export interface ApiSymbol {
  name: string
  kind: number
  kindLabel: string
  module: string
  slug: string
  reflection: any
}

function prettyModule(name: string): string {
  // 'build/src/build/vite/plugin/types' -> 'build/vite/plugin'
  return name.split('/').filter(s => s !== 'src' && s !== 'types').join('/') || name
}

export function getSymbols(): ApiSymbol[] {
  const syms: ApiSymbol[] = []
  for (const mod of metadata.children ?? []) {
    const module = prettyModule(mod.name)
    for (const decl of mod.children ?? []) {
      if (!DOCUMENTED.has(decl.kind))
        continue
      syms.push({
        name: decl.name,
        kind: decl.kind,
        kindLabel: KIND[decl.kind] ?? 'Type',
        module,
        slug: `${module.replace(/\//g, '-')}-${decl.name}`,
        reflection: decl,
      })
    }
  }
  return syms.sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name))
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
    case 'unknown': return t.name ?? 'unknown'
    default: return t.name ?? t.type ?? 'unknown'
  }
}

function renderReflection(decl: any): string {
  if (decl?.signatures?.length) {
    const sig = decl.signatures[0]
    const params = (sig.parameters ?? []).map((p: any) => `${p.name}: ${renderType(p.type)}`).join(', ')
    return `(${params}) => ${renderType(sig.type)}`
  }
  if (decl?.children?.length) {
    return `{ ${decl.children.map((c: any) => `${c.name}${c.flags?.isOptional ? '?' : ''}: ${renderType(c.type)}`).join('; ')} }`
  }
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

export function renderPage(sym: ApiSymbol): string {
  const r = sym.reflection
  const out: string[] = []
  out.push(`# ${sym.name}`, '')
  out.push(`<Badge type="tip" text="${sym.kindLabel}" /> <Badge type="info" text="${sym.module}" />`, '')

  const desc = renderComment(r.comment)
  if (desc)
    out.push(desc, '')

  if (sym.kind === 2097152) {
    out.push('```ts', `type ${sym.name} = ${renderType(r.type)}`, '```')
  }
  else if (sym.kind === 256) {
    const props = (r.children ?? []).filter((c: any) => c.kind === 1024)
    if (props.length) {
      out.push('## Properties', '')
      out.push('| Property | Type | Default | Description |')
      out.push('| :------- | :--- | :------ | :---------- |')
      for (const p of props) {
        const opt = p.flags?.isOptional ? '?' : ''
        const type = `\`${esc(renderType(p.type))}\``
        const def = getDefault(p.comment)
        const defCell = def ? `\`${esc(def)}\`` : ''
        const d = esc(renderComment(p.comment))
        out.push(`| \`${p.name}${opt}\` | ${type} | ${defCell} | ${d} |`)
      }
    }
  }
  return out.join('\n')
}

// sidebar grouped by (pretty) module
export function sidebar() {
  const byModule = new Map<string, ApiSymbol[]>()
  for (const s of getSymbols()) {
    if (!byModule.has(s.module))
      byModule.set(s.module, [])
    byModule.get(s.module)!.push(s)
  }
  return [...byModule.entries()].map(([module, items]) => ({
    text: module,
    collapsed: true,
    items: items.map(s => ({ text: s.name, link: `/api/symbols/${s.slug}` })),
  }))
}

// serializable list for the API index page (via .data loader)
export function symbolIndex() {
  return getSymbols().map(s => ({ name: s.name, kind: s.kindLabel, module: s.module, slug: s.slug }))
}
