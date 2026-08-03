<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/vite-pwa/.github/raw/main/hero-dark.svg" />
  <img alt="Vite PWA Logo" height="200px" src='https://github.com/vite-pwa/.github/raw/main/hero-light.svg'>
</picture>
</div>

<h1 align="center">
Vite PWA
</h1>
<p align="center">
PWA integrations for Vite and the ecosystem
</p>

---

> **⚠️ IMPORTANT: This project is not yet ready for production. 
> This project will not release anything. Its contents will be moved to the corresponding packages at the Vite PWA organization.**
>
> This is a Work-in-Progress fork of Google Workbox, currently under heavy development. APIs may change, documentation is incomplete, and some features may be broken. Please do not use this in production environments yet.

---

## Quick Start

```bash
# Install dependencies – must use pnpm for workspace lockfile
pnpm install --frozen-lockfile

# Build all packages
nr build

# Run all tests
nr test:ci
```

> Requires **pnpm 11.10.0** (see [`packageManager`](./package.json))
>
> After the initial install, you can use [`@antfu/ni`](https://github.com/antfu/ni) shortcuts: `ni` for install, `nr` for running scripts. However, always use `pnpm install --frozen-lockfile` for the initial setup to respect the lockfile.

---

## Why this monorepo?

This monorepo is for testing all integrations and the Workbox fork.

---

## Packages

| Package | Description |
| :------ | :---------- |
| **[@composable-vite-pwa/unplugin-pwa](./packages/unplugin-pwa)** | Main plugin – Vite + Webpack adapters, virtual modules, framework hooks. |
| **[@composable-vite-pwa/workbox-build](./packages/workbox/build)** | Build‑time SW generation (globs assets, injects manifests, bundles the SW). |
| **[@composable-vite-pwa/workbox-swkit](./packages/workbox/swkit)** | Runtime library that runs *inside* the SW (precaching, routing, strategies, expiration, etc.). |
| **[@composable-vite-pwa/workbox-window](./packages/workbox/window)** | Client‑side SW registration + lifecycle helper. |
| **[@composable-vite-pwa/workbox-cli](./packages/workbox/cli)** | CLI for running Workbox strategies. |
| **[@composable-vite-pwa/nuxt](./packages/nuxt)** | Nuxt module. |
| **[@composable-vite-pwa/astro](./packages/astro)** | Astro integration. |
| **[@composable-vite-pwa/react-router](./packages/react-router)** | React Router integration. |
| **[@composable-vite-pwa/sveltekit](./packages/sveltekit)** | SvelteKit integration. |
| **[@composable-vite-pwa/tanstack](./packages/tanstack)** | TanStack Start integration. |
| **[@composable-vite-pwa/vitepress](./packages/vitepress)** | VitePress integration. |

---

## Contributing

We are really excited that you are interested in contributing to this project! Before submitting your contribution, please make sure to take a moment and read through the following guide.

### Set up your local development environment

This repository is a **monorepo** using `pnpm workspaces`. The package manager used to install and link dependencies must be [pnpm](https://pnpm.io/).

1. **Fork** the repository to your own GitHub account and then clone it to your local device.
2. **Ensure using the latest Node.js (22.x)** – this project uses pnpm 11.10.0. If you are working on multiple projects with different versions of pnpm, it's recommended to enable [Corepack](https://github.com/nodejs/corepack) by running `corepack enable`.
3. **Check out a branch** where you can work and commit your changes:
   ```bash
   git checkout -b my-new-branch
   ```
4. **Install dependencies** (must use pnpm for lockfile integrity):
   ```bash
   pnpm install --frozen-lockfile
   ```
   > After this, you can use `ni` (install) and `nr` (run) from [`@antfu/ni`](https://github.com/antfu/ni) for convenience.
5. **Build all packages**:
   ```bash
   nr build
   ```

### Testing changes

The repository includes a set of examples (in the `examples/` folder) where you can test your changes.

> **Note:** Some examples may rely on local packages. Make sure you've built the packages first (`nr build`).

To test a specific example:

```bash
cd examples/<example-name>
ni          # install dependencies (uses pnpm automatically)
nr dev      # or nr build, depending on the example
```

Check your changes against each framework:

- Vue 3 (`examples/unplugin-pwa-vite8-vue-ts`)
- React (`examples/unplugin-pwa-react-router-v8` or `examples/unplugin-pwa-vite8-ts`)
- Nuxt (`examples/unplugin-pwa-nuxt`, `examples/unplugin-pwa-nuxt-pwa-assets`)
- SvelteKit (`examples/unplugin-pwa-sveltekit-manual`)
- Webpack (`examples/unplugin-pwa-webpack-manual`)

### Running tests

```bash
# Run all tests (CI mode)
nr test:ci

# Run tests in watch mode (skips heavy bundler integration tests)
nr test

# Typecheck all packages
nr test:typecheck
```

### Linting

```bash
nr lint
nr lint:fix   # apply safe fixes
```

### Submitting a Pull Request

1. Ensure your changes are **tested** and **linted**.
2. Update the documentation if necessary.
3. Open a Pull Request against the `main` branch with a clear description of the changes and the problem they solve.
4. Link any related issues.

---

## License

[MIT](./LICENSE)

---

## Links

- 🐛 [Issues](https://github.com/userquin/composable-vite-pwa/issues)
