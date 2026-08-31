# @composable-vite-pwa/astro

Zero-config PWA integration for [Astro](https://astro.build).

> **⚠️ This project is not yet ready for production.** APIs may change and documentation is incomplete.

## Installation

```bash
pnpm add @composable-vite-pwa/astro
```

## Peer dependencies

Package	Version	Required
astro	^5.0.0 || ^6.0.0 || ^7.0.0	Yes
@vite-pwa/assets-generator	^1.0.0 || ^2.0.0	Optional
magicast	^0.5.0	Optional (only for generateSW strategy)
rolldown	^1.0.0-0	Optional (only for buildSW strategy)

Requires Node.js >= 22.14.0. 

## Usage 

Add the integration to your `astro.config.mjs`:

```
import { defineConfig } from 'astro/config'

import { AstroPWAIntegration } from '@composable-vite-pwa/astro'

export default defineConfig({

  integrations: [

    AstroPWAIntegration({

      // strategy: 'injectManifest',

      // injectManifest: {

      //   swSrc: 'src/sw.ts',

      // },

    }),

  ],

})
``` 
### Strategies 

The integration supports two strategies: 

* `injectManifest` (default) — uses your own service worker source file. 
* `generateSW`  — auto-generates a service worker using Workbox. 
* `buildSW` — builds a dual (classic + module) service worker (requires `rolldown`).

### Breaking changes from `@vite-pwa/astro` 

Before (@vite-pwa/astro)	Now (@composable-vite-pwa/astro)
workbox option	Deprecated. Use generateSW instead.
srcDir option	Removed. Use relative path in swSrc (e.g. src/sw.ts).
injectRegister	Removed. Use virtual modules instead.
Service worker templates	Removed. Use a custom service worker.
Node.js >= 16	Node.js >= 22.14.0
Vite 3/4	Vite >= 5 (Vite 3/4 may or may not work) 

### License 

[MIT](LICENSE)
