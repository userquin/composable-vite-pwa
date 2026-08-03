# composable-vite-pwa

**Workbox, but composable.** A modular, bundler-agnostic fork of Google Workbox with first‑class support for Vite, Webpack, and other modern bundlers.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

---

## Packages

| Package | Description |
| :------ | :---------- |
| **[@composable-vite-pwa/unplugin-pwa](./packages/unplugin-pwa)** | Main plugin – Vite + Webpack adapters, virtual modules, framework hooks. |
| **[@composable-vite-pwa/workbox-build](./packages/workbox/build)** | Build‑time SW generation (globs assets, injects manifests, bundles the SW). |
| **[@composable-vite-pwa/workbox-swkit](./packages/workbox/swkit)** | Runtime library that runs *inside* the SW (precaching, routing, strategies, expiration, etc.). |
| **[@composable-vite-pwa/workbox-window](./packages/workbox/window)** | Client‑side SW registration + lifecycle helper. |
| **[@composable-vite-pwa/workbox-cli](./packages/workbox/cli)** | CLI for running Workbox strategies. |
| **[@composable-vite-pwa/core](./packages/core)** | Framework‑agnostic client registration (React, Vue, Svelte, Solid, Preact, Vanilla). |
| **[@composable-vite-pwa/nuxt](./packages/nuxt)** | Nuxt module. |
| **[@composable-vite-pwa/astro](./packages/astro)** | Astro integration. |
| **[@composable-vite-pwa/react-router](./packages/react-router)** | React Router integration. |
| **[@composable-vite-pwa/sveltekit](./packages/sveltekit)** | SvelteKit integration. |
| **[@composable-vite-pwa/tanstack](./packages/tanstack)** | TanStack Start integration. |
| **[@composable-vite-pwa/vitepress](./packages/vitepress)** | VitePress integration. |
| **[@composable-vite-pwa/types](./packages/workbox/types)** | Shared TypeScript types. |

---

## Architecture

The monorepo follows a **two‑layer bundler model**:

1. **Outer bundler** – Vite, Webpack, Rolldown, or rspack builds the user's app.
2. **Inner bundler** – Always Rolldown, compiles the service worker in isolation.

All adapters share the same core engine via `workbox-build`. The core exposes three strategies:

- **`build-sw`** – bundles your custom SW and injects the manifest via `define`.
- **`generate-sw`** – writes the SW from scratch using `magicast` (AST).
- **`inject-manifest`** – string‑splices the manifest into your SW (no bundling).

For detailed architecture, see the [internal repo guide](./repo-guide/00-big-picture.md).

---

## Quick Start

```bash
pnpm install
pnpm build
pnpm test:ci
```

---

## License

[MIT](./LICENSE) © 2020-PRESENT [Anthony Fu](https://github.com/antfu) & Contributors

---

## Links

- 🐛 [Issues](https://github.com/userquin/composable-vite-pwa/issues)
