<script setup lang="ts">
// import { PwaTransparentImage } from '#pwa-components'

const icons = useNuxtApp().$pwaIcons
// if (icons) {
//   console.log(icons.transparent['pwa-192x192.png'])
// }

const { icon } = useTransparentPwaIcon('pwa-64x64.png')

// if (import.meta.client) {
// const xpwa = usePWA()
// xeslint-disable-next-line no-console
// console.log(xpwa)
// }
</script>

<template>
  <div class="center">
    <div class="icons">
      <PwaTransparentImage class="pepe" image="pwa-64x64.png" crossorigin="" alt="pwa transperent 64x64" />
      <ClientOnly>
        <span>
          PWA Installed: {{ $pwa?.isPWAInstalled }}

          {{ $pwaIcons?.transparent?.['pwa-64x64.png'] }}

        </span>
      </ClientOnly>
    </div>
    <details>
      <summary>some icons</summary>
      <pre>{{ $router.currentRoute.value.name }}</pre>
      <pre>{{ $config.app.buildId }}</pre>
      <pre>{{ icon }}</pre>
      <pre>{{ icons }}</pre>
    </details>
    <NuxtWelcome />
  </div>
</template>

<style scoped>
.center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
details, .icons {
  justify-self: center;
}
details {
  width: calc(100vw - 2rem);
}
</style>
