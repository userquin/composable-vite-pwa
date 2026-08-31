# @composable-vite-pwa/sveltekit

Zero-config PWA integration for [SvelteKit](https://kit.svelte.dev).

> **⚠️ This project is not yet ready for production.** APIs may change and documentation is incomplete.

## Installation

```bash
pnpm add @composable-vite-pwa/sveltekit
```

### Peer dependencies 

Package	Version	Required
@sveltejs/kit	^1.3.1 || ^2.0.1 || ^3.0.0-0	Yes
@vite-pwa/assets-generator	^1.0.0 || ^2.0.0	Optional
magicast	^0.5.0	Optional (only for generateSW strategy)
rolldown	^1.0.0-0	Optional (only for buildSW strategy)

Requires Node.js >= 22.14.0.

### Usage 

Replace `sveltekit()` with `withPwa()` in your `vite.config.ts`:

```ts
import { withPwa } from '@composable-vite-pwa/sveltekit'

import { defineConfig } from 'vite'

export default defineConfig({

  plugins: [

    withPwa(

      // optional sveltekit config

      {},

      // PWA options

      {

        // strategy: 'injectManifest',

        // injectManifest: {

        //   swSrc: 'src/sw.ts',

        // },

      },

    ),

  ],

})
```
The first argument is the same config you would pass to sveltekit(). The second argument is the PWA configuration.

### Legacy export
A legacy adapter is available at @composable-vite-pwa/sveltekit/legacy for projects that need backward-compatible behavior.

### Strategies
The integration supports two strategies:

- `injectManifest` (default) — uses your own service worker source file.
- `generateSW` — auto-generates a service worker using Workbox.
- `buildSW` — builds a dual (classic + module) service worker (requires rolldown).

### Breaking changes from  `@vite-pwa/sveltekit`

Before (@vite-pwa/sveltekit)	Now (@composable-vite-pwa/sveltekit)
`workbox` option	Deprecated. Use `generateSW` instead.
`srcDir` option	Removed. Use relative path in `swSrc` (e.g. `src/sw.ts`).
`injectRegister`	Removed. Use virtual modules instead.
Service worker templates	Removed. Use a custom service worker.
Node.js >= 16	Node.js >= 22.14.0
Vite 3/4	Vite >= 5 (Vite 3/4 may or may not work)

### License
[MIT](LICENSE)



