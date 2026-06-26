/* eslint-disable no-console */
// Generate one TypeDoc JSON per workbox package (full public API — types AND
// runtime). The Vite PWA docs site consumes these to render a page per package.
import { execFileSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('.', import.meta.url))
let typedoc = fileURLToPath(new URL('./node_modules/.bin/typedoc', import.meta.url)).replace(/\\/g, '/')
if (process.platform === 'win32') {
  typedoc += '.CMD'
}

// Entry points = each package's public API (must match subpath exports).
// `exclude` = internal modules NOT referenced by any subpath export.
const packages = {
  swkit: {
    entryPoints: [
      '../swkit/src/background-sync/index.ts',
      '../swkit/src/background-sync/types.ts',
      '../swkit/src/broadcast-update/index.ts',
      '../swkit/src/broadcast-update/types.ts',
      '../swkit/src/cacheable-response/index.ts',
      '../swkit/src/cacheable-response/types.ts',
      '../swkit/src/core/index.ts',
      '../swkit/src/core/types.ts',
      '../swkit/src/expiration/index.ts',
      '../swkit/src/expiration/types.ts',
      '../swkit/src/navigation-preload/index.ts',
      '../swkit/src/precaching/index.ts',
      '../swkit/src/precaching/types.ts',
      '../swkit/src/range-requests/index.ts',
      '../swkit/src/recipes/index.ts',
      '../swkit/src/routing/index.ts',
      '../swkit/src/routing/types.ts',
      '../swkit/src/streams/index.ts',
      '../swkit/src/streams/types.ts',
      '../swkit/src/strategies/index.ts',
    ],
    exclude: [
      '**/core/_private/**',
      '**/core/utils/**',
      '**/core/models/**',
      '**/routing/utils/getOrCreateDefaultRouter.ts',
      '**/routing/utils/normalizeHandler.ts',
      '**/precaching/utils/**',
      '**/range-requests/utils/**',
      '**/streams/utils/**',
      '**/strategies/utils/**',
      '**/strategies/plugins/**',
      '**/broadcast-update/utils/**',
      '**/expiration/models/**',
      '**/background-sync/lib/**',
    ],
    output: 'workbox-swkit.json',
  },
  window: {
    entryPoints: [
      '../window/src/index.ts',
      '../window/src/esm-sw-detector.ts',
    ],
    // `index.ts` does `export * from './utils/WorkboxEvent'`, so the blanket
    // `utils/**` exclude was dropping public event types. Exclude only the
    // genuinely-internal helpers; keep WorkboxEvent(+Target) documentable.
    exclude: [
      '**/window/src/utils/Deferred.ts',
      '**/window/src/utils/dontWaitFor.ts',
      '**/window/src/utils/urlsMatch.ts',
      '**/window/src/utils/logger.ts',
    ],
    output: 'workbox-window.json',
  },
  build: {
    entryPoints: [
      '../build/src/index.ts',
      '../build/src/types.ts',
      '../build/src/config/index.ts',
      '../build/src/config/types.ts',
      '../build/src/build/types.ts',
      '../build/src/build/vite/index.ts',
      '../build/src/build/vite/types.ts',
      '../build/src/build/vite/build-sw.ts',
      '../build/src/build/vite/generate-sw.ts',
      '../build/src/build/vite/legacy-build-sw.ts',
      '../build/src/build/vite/legacy-generate-sw.ts',
      '../build/src/build/vite/legacy-types.ts',
      '../build/src/build/vite/plugin/index.ts',
      '../build/src/build/vite/plugin/types.ts',
      '../build/src/build/rolldown/index.ts',
      '../build/src/build/rolldown/types.ts',
      '../build/src/build/rolldown/build-sw.ts',
      '../build/src/build/rolldown/generate-sw.ts',
      '../build/src/build/webpack/index.ts',
      '../build/src/build/rspack/index.ts',
      '../build/src/utils/resolve-sw-names.ts',
    ],
    exclude: [
      '**/build/builder/**',
      '**/validation/**',
      '**/schema/**',
      '**/build/vite/build-context.ts',
      '**/build/vite/build-utils.ts',
      '**/build/vite/internal-types.ts',
      '**/build/vite/plugin/plugin-builder.ts',
      '**/build/vite/plugin/plugin-context.ts',
      '**/build/rolldown/build-context.ts',
      '**/build/rolldown/build-utils.ts',
      '**/build/rolldown/generate-manifest.ts',
      '**/build/rolldown/internal-types.ts',
    ],
    output: 'workbox-build.json',
  },
  unplugin: {
    entryPoints: [
      '../../unplugin-pwa/src/node/vite/index.ts',
      '../../unplugin-pwa/src/node/types.ts',
      '../../unplugin-pwa/src/node/additional-manifest-entries.ts',
      '../../unplugin-pwa/src/node/assets.ts',
      '../../unplugin-pwa/src/node/build-pwa-asset.ts',
      '../../unplugin-pwa/src/node/config.ts',
      '../../unplugin-pwa/src/node/constants.ts',
      '../../unplugin-pwa/src/node/context.ts',
      '../../unplugin-pwa/src/node/context-types.ts',
      '../../unplugin-pwa/src/node/create-generate-register-sw-script.ts',
      '../../unplugin-pwa/src/node/create-web-manifest-html-link.ts',
      '../../unplugin-pwa/src/node/dual-sw-utilities.ts',
      '../../unplugin-pwa/src/node/generate-register-sw.ts',
      '../../unplugin-pwa/src/node/generate-virtual-module.ts',
      '../../unplugin-pwa/src/node/html.ts',
      '../../unplugin-pwa/src/node/inject-generate-register-sw.ts',
      '../../unplugin-pwa/src/node/inject-web-manifest-html-link.ts',
      '../../unplugin-pwa/src/node/prepare-pwa-context.ts',
      '../../unplugin-pwa/src/node/vite/helpers.ts',
      '../../unplugin-pwa/src/node/vite/vite-context.ts',
      '../../unplugin-pwa/src/node/vite/dev/create-hmr-script.ts',
      '../../unplugin-pwa/src/node/vite/dev/hmr-support.ts',
      '../../unplugin-pwa/src/node/vite/dev/inject-hmr-script.ts',
      '../../unplugin-pwa/src/node/vite/dev/prepare-register-sw.ts',
      '../../unplugin-pwa/src/node/vite/dev/prepare-sw-build.ts',
      '../../unplugin-pwa/src/node/vite/dev/prepare-sw-names-and-glob-directory.ts',
      '../../unplugin-pwa/src/node/vite/dev/prepare-temp-folder.ts',
      '../../unplugin-pwa/src/node/vite/plugins/build.ts',
      '../../unplugin-pwa/src/node/vite/plugins/dev.ts',
      '../../unplugin-pwa/src/node/vite/plugins/dev-middleware.ts',
      '../../unplugin-pwa/src/node/vite/plugins/dev-pwa-assets-middleware.ts',
      '../../unplugin-pwa/src/node/vite/plugins/info.ts',
      '../../unplugin-pwa/src/node/vite/plugins/main.ts',
      '../../unplugin-pwa/src/node/vite/plugins/pwa-assets.ts',
    ],
    exclude: [
      '**/node/pwa-assets/**',
      '**/client/**',
      '**/env.d.ts',
    ],
    output: 'unplugin-pwa.json',
  },
  cli: {
    // Public API = the package's `.` barrel (matches `exports`). Pointing at
    // options.ts would also document its internal helpers (StrategyName,
    // STRATEGY_META, STRATEGY_NAMES), which aren't part of the public surface.
    entryPoints: [
      '../cli/src/index.ts',
    ],
    exclude: [],
    output: 'workbox-cli.json',
  },
}

const apiDir = fileURLToPath(new URL('./api', import.meta.url))
rmSync(apiDir, { recursive: true, force: true })
mkdirSync(apiDir, { recursive: true })

for (const [name, { entryPoints, exclude, output }] of Object.entries(packages)) {
  console.log(`\n[gen] ${name} — ${entryPoints.length} entry point(s)`)
  execFileSync(typedoc, [
    '--tsconfig',
    './typedoc.tsconfig.json',
    '--json',
    `./api/${output}`,
    '--name',
    name,
    '--excludeInternal',
    '--readme',
    'none',
    ...exclude.flatMap(e => ['--exclude', e]),
    ...entryPoints,
  ], {
    cwd: dir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}

console.log('\n[gen] done — per-package JSON written to api/')
