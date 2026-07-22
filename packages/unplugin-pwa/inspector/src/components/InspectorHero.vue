<script setup lang="ts">
import { useLocalStorage, useMediaQuery } from '@vueuse/core'
import { computed } from 'vue'

const base = import.meta.env.BASE_URL
const light = `${base}icon_light.svg`
const dark = `${base}icon_dark.svg`

const nuxtDevtoolsSetting = useLocalStorage('nuxt-devtools-color-mode', 'auto', {
  shallow: true,
  initOnMounted: false,
  listenToStorageChanges: true,
  writeDefaults: false,
})

const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

const heroClass = computed(() => {
  const setting = nuxtDevtoolsSetting.value
  const pd = prefersDark.value

  return setting === 'dark' || (pd && setting !== 'light') ? 'dark' : 'light'
})
</script>

<template>
  <header
    class="px-4 py-2 border-b border-main flex children:my-auto"
  >
    <div class="flex flex-auto children:my-auto ws-nowrap">
      <div class="w-8 h-8">
        <img
          :src="light"
          class="w-full h-full m-auto dark-hidden"
          alt="Vite PWA Inspector logo"
          draggable="false"
          :class="heroClass"
        >
        <img
          :src="dark"
          class="w-full h-full m-auto light-hidden"
          alt="Vite PWA Inspector logo"
          draggable="false"
          :class="heroClass"
        >
      </div>
      <div class="of-hidden pl-2 mt-[3px]">
        Vite PWA Inspector
        <sup class="text-teal-700 bg-teal-700/10 dark:bg-teal-900/30 dark:text-teal-400 px-1.5 py-0.5 rounded italic">beta</sup>
      </div>
    </div>
  </header>
</template>

<style scoped>
@media (prefers-color-scheme: light) {
  .light-hidden {
    display: none;
  }
}
@media (prefers-color-scheme: dark) {
  .dark-hidden {
    display: none;
  }
}

.dark.light-hidden {
  display: unset;
}
.dark.dark-hidden {
  display: none;
}
.light.dark-hidden {
  display: unset;
}
.light.light-hidden {
  display: none;
}
</style>
