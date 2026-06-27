/* eslint-disable no-console */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { getPackages, getSymbols } from './lib/generate.ts'
import { renderPackageHTML, renderSymbolPage } from './lib/render.ts'

mkdirSync(resolve('api/packages'), { recursive: true })

const packages = getPackages()
for (const pkg of packages) {
  const html = renderPackageHTML(pkg)
  const outPath = resolve(`api/packages/${pkg.slug}.md`)
  writeFileSync(outPath, html, 'utf-8')
  console.log(`✅ Generated package page: ${outPath}`)
}

// Wipe and recreate so stale files from old flat layout don't linger.
rmSync(resolve('api/symbols'), { recursive: true, force: true })
mkdirSync(resolve('api/symbols'), { recursive: true })

const symbols = getSymbols()
for (const s of symbols) {
  const page = renderSymbolPage(s)
  const outPath = resolve(`api/symbols/${s.slug}.md`)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, page, 'utf-8')
}
console.log(`✅ Generated ${symbols.length} symbol pages`)
