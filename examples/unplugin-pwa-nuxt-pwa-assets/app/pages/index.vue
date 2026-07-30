<script setup lang="ts">
const icons = useNuxtApp().$pwaIcons

const { icon } = useTransparentPwaIcon('pwa-64x64.png')

if (import.meta.client) {
  const pwa = usePWA()
  // eslint-disable-next-line no-console
  console.log(pwa)
}
</script>

<template>
  <div class="center">
    <div class="icons">
      <PwaTransparentImage image="pwa-64x64.png" alt="pwa transperent 64x64" />
      <ClientOnly>
        <span>
          PWA Installed: {{ $pwa?.isPWAInstalled }}
        </span>
      </ClientOnly>
    </div>
    <details>
      <summary>some icons</summary>
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
