## TODO

### buildSW tests — done
- [x] Vite modern (`buildSW`) · Vite legacy <8 (`buildSWLegacy`) · Rolldown · webpack · rspack
- [x] Manifest injection asserted (not just file existence)

### generateSW tests — done
- [x] Vite modern (`generateSW`) · Vite legacy <8 (`generateSWLegacy`) · Rolldown
- [x] webpack · rspack (`WorkboxPlugin('generate-sw', { generateSW })`)
- [x] Precache entry asserted (output filename in SW, no `__WB_MANIFEST` placeholder)
- [x] `createGenerateSWPlugin` added to `test/utils/plugin-utils.ts` (Vite/Rolldown only)

Note: Vite modern `generateSW` requires `workbox-swkit` to be built (`pnpm --filter @composable-vite-pwa/workbox-swkit build`) because its inner Vite build resolves packages strictly via `exports` (no source fallback). webpack/rspack route through the same Rolldown engine, which also needs the built `swkit`.

### injectManifest tests — done
- [x] Core engine (`inject-manifest.spec.ts`) — happy path + 4 error gates
  (injection-point-not-found · multiple-injection-points · same-src-and-dest · invalid-sw-src)
- [x] webpack · rspack wiring (`WorkboxPlugin('inject-manifest', { injectManifest })`)
- [x] Error assertions use single-source `errors[key]` (no copied message fragments)

Note: injectManifest is bundler-agnostic — one engine (`utils/build-inject-manifest.ts`), no
per-bundler variant. It's a pure string-splice (read swSrc → replace injectionPoint → write swDest),
so Vite/Rolldown need no dedicated wiring tests: the core spec covers the engine end-to-end, and
webpack/rspack only verify the plugin's afterEmit → injectManifest hand-off. No `swkit` build
required (no bundling = imports left as text).

### CJS plugin tests
- [ ] webpack plugin
- [ ] rspack plugin

### `@vite-pwa/core` package
- [ ] Copy Vite + Rolldown plugins to core sub-exports
- [ ] Add `vite/index.ts` to core package
- [ ] Expose `context.ts` in core package
- [ ] Remove deprecated Workbox entry/option from core types

### `workbox-cli` — done
- [x] Bootstrap using Vite CLI as base (same deps + prompts)
- [x] Add Vite + Rolldown plugins (removes test-utils dependency)
- [x] Single spec scoped to CLI for all three(+1) strategies

### `workbox-types` (new package)
- [ ] Create a dedicated `workbox-types` package that generates JSON files from JSDoc/types
- [ ] Style reference: https://router.vuejs.org/api/type-aliases/NavigationGuardReturn.html
- [ ] Check `docs:api` script at vue-router repo for the generation pipeline
- [ ] The vite-pwa docs repo is a separate GH repo, it cannot import `workbox-swkit` or
      `workbox-build` directly, so `workbox-types` must be a standalone package that:
        1. Reads types from `workbox-swkit` / `workbox-build`
        2. Generates JSON output files
        3. Gets published so the docs repo can consume it as a dependency
- [ ] VitePress will then include the generated JSON as API reference pages

### Known issues / follow-ups
- [ ] Add service worker tests
- [ ] Reverse strategy precedence in the `@build/webpack` and `@build/rspack` plugins: a strategy
  passed to the plugin constructor must override the config file's default strategy (currently
  the resolved config wins — `strategy ?? buildContext.strategy` in
  `build/builder/internal-webpack-build.ts`; update the `**WARNING**` JSDoc in both plugins when fixed)
