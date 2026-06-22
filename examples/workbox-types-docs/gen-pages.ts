// Prebuild step: render one Markdown page per documented type from the
// workbox-types JSON metadata into api/symbols/. VitePress then builds them
// as normal pages. This is the "consuming logic" the example demonstrates.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { getSymbols, renderPage } from './.vitepress/api.ts'

const dir = fileURLToPath(new URL('./api/symbols', import.meta.url))
rmSync(dir, { recursive: true, force: true })
mkdirSync(dir, { recursive: true })

let n = 0
for (const sym of getSymbols()) {
  writeFileSync(`${dir}/${sym.slug}.md`, `${renderPage(sym)}\n`)
  n++
}
console.log(`[gen-pages] wrote ${n} API pages to api/symbols/`)
