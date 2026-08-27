# @composable-vite-pwa/workbox-window

A helper library that simplifies communication with Workbox packages running in a service worker, and manages the service worker lifecycle.

This is a composable rework of the original [workbox-window](https://developer.chrome.com/docs/workbox/modules/workbox-window/) package.

> **⚠️ This project is not yet ready for production.** APIs may change and documentation is incomplete.

## Installation

```bash
pnpm add @composable-vite-pwa/workbox-window
```

## Usage 

### Registering a service worker 

```ts
import { Workbox } from '@composable-vite-pwa/workbox-window'

if ('serviceWorker' in navigator) {

  const wb = new Workbox('/sw.js')

  wb.addEventListener('installed', (event) => {

    if (event.isUpdate) {

      console.log('New service worker installed — content updated.')

    } else {

      console.log('Service worker installed for the first time.')

    }

  })

  wb.register()

}
```
### Sending a message to the service worker 

```ts
import { messageSW } from '@composable-vite-pwa/workbox-window'

// Assuming `wb` is a Workbox instance

const sw = wb.active ?? wb.waiting ?? wb.installing

if (sw) {

  const response = await messageSW(sw, { type: 'GET_CACHED_URLS' })

  console.log(response)

}
```
### ESM service worker detection 

```ts
import { isSupported } from '@composable-vite-pwa/workbox-window/esm-sw-detector'

const supported = await isSupported()

if (supported) {

  // ESM service workers are supported in this browser

}
```
### Exports 

Entry	Description
`@composable-vite-pwa/workbox-window`	`Workbox class`, `messageSW helper`, and WorkboxEvent types.
`@composable-vite-pwa/workbox-window/esm-sw-detector`	`isSupported()` — detects ESM service worker support.

### License
[MIT](LICENSE)
