## TODO

### buildSW tests — done (#16, merged)
- [x] Vite modern (`buildSW`) · Vite legacy <8 (`buildSWLegacy`) · Rolldown (`writeBundle`) · webpack · rspack
- [x] Manifest injection asserted (not just file existence)

### generateSW tests
- [ ] Vite modern (`generateSW`)
- [ ] Vite legacy <8 (`generateSWLegacy`)
- [ ] Rolldown
- [ ] webpack
- [ ] rspack

### injectManifest tests
- [ ] Vite (modern)
- [ ] Rolldown
- [ ] webpack
- [ ] rspack

### CJS plugin tests
- [ ] webpack plugin
- [ ] rspack plugin

### `@vite-pwa/core` package
- [ ] Copy Vite + Rolldown plugins to core sub-exports
- [ ] Add `vite/index.ts` to core package
- [ ] Expose `context.ts` in core package
- [ ] Remove deprecated Workbox entry/option from core types

### `workbox-cli` (new package)
- [ ] Bootstrap using Vite CLI as base (same deps + prompts)
- [ ] Add Vite + Rolldown plugins (removes test-utils dependency)
- [ ] Single spec scoped to CLI for all three strategies

### Known issues / follow-ups
- [ ] Switch `writeBundle` → `closeBundle` once Rolldown fixes the hook (https://github.com/rolldown/rolldown/issues/3025)
- [ ] Add service worker tests
