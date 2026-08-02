import type { UnwrapNestedRefs } from 'vue'
import type { PWAIcons } from '#build/pwa-icons/index.js'
import type { PwaInjection } from './plugins/types.js'

declare module '#app' {
  interface NuxtApp {
    /**
     * Reactive PWA state and controls provided by `@vite-pwa/nuxt`.
     *
     * @example
     * ```ts
     * const { $pwa } = useNuxtApp()
     * if ($pwa?.needRefresh) await $pwa.updateServiceWorker()
     * ```
     */
    $pwa?: UnwrapNestedRefs<PwaInjection>
    /**
     * Available PWA icons.
     */
    $pwaIcons?: PWAIcons
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    /**
     * Reactive PWA state and controls provided by `@vite-pwa/nuxt`.
     *
     * @example
     * ```html
     * <button v-if="$pwa?.needRefresh" v-on:click="$pwa?.updateServiceWorker()">Update</button>
     * ```
     */
    $pwa?: UnwrapNestedRefs<PwaInjection>
    /**
     * Available PWA icons.
     */
    $pwaIcons?: PWAIcons
  }
}

declare global {
  // eslint-disable-next-line vars-on-top
  var $pwa: UnwrapNestedRefs<PwaInjection> | undefined
  // eslint-disable-next-line vars-on-top
  var $pwaIcons: PWAIcons | undefined
}

export {}
