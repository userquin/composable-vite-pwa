# TODOS

## Completed (already done)

### buildSW tests - done
- [x] Vite modern (`buildSW`) · Vite legacy <8 (`buildSWLegacy`) · Rolldown · webpack · rspack
- [x] Manifest injection asserted (not just file existence)

### generateSW tests - done
- [x] Vite modern (`generateSW`) · Vite legacy <8 (`generateSWLegacy`) · Rolldown
- [x] webpack · rspack (`WorkboxPlugin('generate-sw', { generateSW })`)
- [x] Precache entry asserted (output filename in SW, no `__WB_MANIFEST` placeholder)
- [x] `createGenerateSWPlugin` added to `test/utils/plugin-utils.ts` (Vite/Rolldown only)

### injectManifest tests - done
- [x] Core engine (`inject-manifest.spec.ts`) - happy path + 4 error gates
  (injection-point-not-found · multiple-injection-points · same-src-and-dest · invalid-sw-src)
- [x] webpack · rspack wiring (`WorkboxPlugin('inject-manifest', { injectManifest })`)
- [x] Error assertions use single-source `errors[key]` (no copied message fragments)

### workbox-cli - done
- [x] Bootstrap using Vite CLI as base (same deps + prompts)
- [x] Add Vite + Rolldown plugins (removes test-utils dependency)
- [x] Single spec scoped to CLI for all three(+1) strategies

---

## Testing Improvements & Fixes

### Service Worker tests (Playwright)
- [ ] Add Service Worker tests via Playwright (for swkit)

### CJS plugin tests
- [ ] webpack plugin
- [ ] rspack plugin
- [ ] Add tests for the newly added Webpack CJS example
- [ ] Add Rspack / Rsbuild examples (for CJS testing)

---

## Infrastructure & Dependency Upgrades

- [ ] Update vitest to beta 5 (or latest)
- [ ] Update Vite to latest version (to fix CVE)

---

## `@vite-pwa/core` package

- [ ] Copy Vite + Rolldown plugins to core sub‑exports
- [ ] Add `vite/index.ts` to core package
- [ ] Expose `context.ts` in core package
- [ ] Remove deprecated Workbox entry/option from core types

---

## CLI & Strategies

- [x] **Add `self-destroy-sw` CLI option** - the CLI option and some tests.
- [x] The strategy already exists as a standalone case in `internal-webpack-build.ts`. The CLI should expose it as a top-level option (e.g., `--self-destroy` or `strategy: 'self-destroy-sw'`).
- [x] Tests: add coverage for the `self-destroy-sw` strategy path in CLI.
- [ ] Reverse strategy precedence in `@build/webpack` and `@build/rspack` plugins
  *A strategy passed to the plugin constructor must override the config file's default strategy (currently the resolved config wins – `strategy ?? buildContext.strategy` in `build/builder/internal-webpack-build.ts`). Update the **WARNING** JSDoc in both plugins when fixed.*

---

## Workbox Types (JSDoc package) - done

Standalone `@composable-vite-pwa/workbox-types` package (`packages/workbox/types`) that runs
TypeDoc over the JSDoc/types of `workbox-swkit` and `workbox-build` and publishes the **JSON
metadata**. The Vite PWA docs site ([vite-pwa/docs](https://github.com/vite-pwa/docs), a
VitePress app) installs this package and renders the API pages from that metadata — it can't
import `workbox-swkit` / `workbox-build` directly (separate repo), so the JSON is the contract
between the two.

- [x] Dedicated package; `pnpm docs:api` runs TypeDoc (`--json`) over the public `*/types`
  entry points of swkit/build → `api/metadata.json`.
  - Reference pipeline: vue-router's `docs:api`. We emit **JSON metadata** (not the Markdown
    vue-router renders in-repo) because page rendering lives in the separate docs repo — per
    the maintainer: "just the json metadata, then at pwa docs use it to generate the api pages."
- [x] **Standalone**: reads types from `workbox-swkit` / `workbox-build` (devDependencies only
  — they never reach consumers), and is published (`files: ["api"]`, `prepack` regenerates on
  publish) so the docs repo consumes the JSON without importing the workbox packages.
- [x] **VitePress**: an example of rendering the /workbox/types package lives in /examples/workbox-types-docs

Notes: the output is raw TypeDoc JSON (schema-backed); a curated/normalized schema can be
agreed with the docs repo later if its renderer wants a leaner shape. `swkit/src/types.ts` was
fixed to re-export only `*/types` files (dropping the runtime-bearing `strategies` / `recipes`
/ `range-requests` barrels), so the metadata is **types-only** (no runtime classes/functions).
The remaining unresolved `{@link workbox-*}` cross-references point at Workbox runtime symbols
documented upstream — the docs renderer decides how to surface them.

---

## Known Issues / Follow-ups

- [ ] Add service worker tests (via Playwright - tracked above)
- [ ] Reverse strategy precedence in the `@build/webpack` and `@build/rspack` plugins
  *(tracked above)*
