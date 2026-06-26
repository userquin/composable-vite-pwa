/* eslint-disable no-console */
// Prebuild step: render one Markdown page per documented type from the
// workbox-types JSON metadata into api/symbols/, and one page per package
// into api/packages/. VitePress then builds them as normal pages. This is
// the "consuming logic" the example demonstrates.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getPackages, getSymbols, renderPackagePage, renderPage } from './.vitepress/api.ts'

const symbolsDir = fileURLToPath(new URL('./api/symbols', import.meta.url))
rmSync(symbolsDir, { recursive: true, force: true })
mkdirSync(symbolsDir, { recursive: true })

let n = 0
for (const sym of getSymbols()) {
  writeFileSync(`${symbolsDir}/${sym.slug}.md`, `${renderPage(sym)}\n`)
  n++
}
console.log(`[gen-pages] wrote ${n} API pages to api/symbols/`)

// ── Package summary pages (JavaDoc-style) ────────────────────────────────
const pkgDir = fileURLToPath(new URL('./api/packages', import.meta.url))
rmSync(pkgDir, { recursive: true, force: true })
mkdirSync(pkgDir, { recursive: true })

let m = 0
for (const pkg of getPackages()) {
  writeFileSync(`${pkgDir}/${pkg.slug}.md`, `${renderPackagePage(pkg)}\n`)
  m++
}
console.log(`[gen-pages] wrote ${m} package pages to api/packages/`)
