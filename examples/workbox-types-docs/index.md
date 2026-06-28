---
layout: home
hero:
  name: Workbox Types
  text: API Reference
  tagline: Rendered at build time from the @composable-vite-pwa/workbox-types JSON metadata
  actions:
    - theme: brand
      text: Browse the API
      link: /api/
features:
  - title: From JSON metadata
    details: Pages are generated from the published TypeDoc metadata.json — this site never imports workbox-swkit or workbox-build.
  - title: Build & service-worker types
    details: GenerateSW / InjectManifest options, RuntimeCaching, VitePWAOptions, plugin options, and the service-worker types.
  - title: VitePress dynamic routes
    details: One page per type via a build-time loader — the same pattern the real vite-pwa docs site will use.
---
