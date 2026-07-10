# Webpack 5 manual example

Build the package, then run `pnpm --filter unplugin-pwa-webpack-manual build`. The virtual registration import is bundled and the plugin emits `dist/sw.js` and `dist/manifest.webmanifest`.

The adapter is exported from `@composable-vite-pwa/unplugin-pwa/webpack`. Because Webpack support is optional, applications using this adapter install both peer dependencies:

```bash
pnpm add -D webpack webpack-virtual-modules @composable-vite-pwa/unplugin-pwa
```

For webpack-dev-server, enable development support and append the supplied middleware:

```js
import { getDevMiddlewares, WebpackPWA } from '@composable-vite-pwa/unplugin-pwa/webpack'

const pwa = WebpackPWA({ devOptions: { enabled: true } })

export default {
  plugins: [pwa],
  devServer: {
    setupMiddlewares(middlewares, server) {
      middlewares.push(...getDevMiddlewares(pwa.api).map(middleware => ({ middleware })))
      return middlewares
    },
  },
}
```

Import `virtual:pwa-register` for application-controlled registration, or `virtual:pwa-entry-point-loaded` to register the development worker through Webpack's HMR runtime.
