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

- [ ] Add `self-destroy` SW strategy to the CLI
- [ ] Reverse strategy precedence in `@build/webpack` and `@build/rspack` plugins
  *A strategy passed to the plugin constructor must override the config file's default strategy (currently the resolved config wins – `strategy ?? buildContext.strategy` in `build/builder/internal-webpack-build.ts`). Update the **WARNING** JSDoc in both plugins when fixed.*

---

## Workbox Types (JSDoc package)

- [ ] Create a dedicated `workbox-types` package that generates JSON files from JSDoc / types
  - Style reference: [NavigationGuardReturn](https://router.vuejs.org/api/type-aliases/NavigationGuardReturn.html)
  - Check `docs:api` script at vue-router repo for the generation pipeline
- [ ] Ensure the package is **standalone** – the `vite-pwa` docs repo cannot import `workbox-swkit` or `workbox-build` directly, so `workbox-types` must:
  1. Read types from `workbox-swkit` / `workbox-build`
  2. Generate JSON output files
  3. Get published so the docs repo can consume it as a dependency
- [ ] Use **VitePress** to include the generated JSON as API reference pages

---

## Known Issues / Follow-ups

- [ ] Add service worker tests (via Playwright — tracked above)
- [ ] Reverse strategy precedence in the `@build/webpack` and `@build/rspack` plugins
  *(tracked above)*
