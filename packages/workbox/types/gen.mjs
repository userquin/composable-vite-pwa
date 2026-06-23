/* eslint-disable no-console */
// Generate one TypeDoc JSON per workbox package (full public API — types AND
// runtime). The Vite PWA docs site consumes these to render a page per package.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
const typedoc = fileURLToPath(new URL('./node_modules/.bin/typedoc', import.meta.url))

// Entry points = each package's public API.
// - swkit / window: the index barrel re-exports everything → one entry.
// - build: spread across many subpath exports → list them (the "complex" one).
const packages = {
  swkit: [
    '../swkit/src/background-sync/index.ts',
    '../swkit/src/broadcast-update/index.ts',
    '../swkit/src/cacheable-response/index.ts',
    '../swkit/src/core/index.ts',
    '../swkit/src/expiration/index.ts',
    '../swkit/src/navigation-preload/index.ts',
    '../swkit/src/precaching/index.ts',
    '../swkit/src/range-requests/index.ts',
    '../swkit/src/recipes/index.ts',
    '../swkit/src/routing/index.ts',
    '../swkit/src/streams/index.ts',
    '../swkit/src/strategies/index.ts',
  ],
  window: ['../window/src/index.ts'],
  build: [
    '../build/src/index.ts',
    '../build/src/types.ts',
    '../build/src/config/index.ts',
    '../build/src/config/types.ts',
    '../build/src/build/types.ts',
    '../build/src/build/vite/index.ts',
    '../build/src/build/vite/types.ts',
    '../build/src/build/vite/plugin/index.ts',
    '../build/src/build/vite/plugin/types.ts',
    '../build/src/build/rolldown/index.ts',
    '../build/src/build/rolldown/types.ts',
    '../build/src/build/webpack/index.ts',
    '../build/src/build/rspack/index.ts',
  ],
}

const apiDir = fileURLToPath(new URL('./api', import.meta.url))
rmSync(apiDir, { recursive: true, force: true })
mkdirSync(apiDir, { recursive: true })

for (const [name, entryPoints] of Object.entries(packages)) {
  console.log(`\n[gen] ${name} — ${entryPoints.length} entry point(s)`)
  execFileSync(typedoc, [
    '--tsconfig',
    './typedoc.tsconfig.json',
    '--json',
    `./api/${name}.json`,
    '--name',
    name,
    '--excludeInternal',
    '--readme',
    'none',
    // internal modules not exposed via subpackage exports — keep them out of the docs
    '--exclude',
    '**/build/builder/**',
    '--exclude',
    '**/validations/**',
    ...entryPoints,
  ], { cwd: dir, stdio: 'inherit' })
}

console.log('\n[gen] done — per-package JSON written to api/')
