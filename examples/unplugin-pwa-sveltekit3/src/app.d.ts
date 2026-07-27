import '@composable-vite-pwa/unplugin-pwa/svelte'
import '@composable-vite-pwa/unplugin-pwa/info'
import '@composable-vite-pwa/unplugin-pwa/vite-hmr-entry-point'

// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  declare const __DATE__: string
  declare const __RELOAD_SW__: boolean
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
