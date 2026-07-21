<script setup lang="ts">
const base = import.meta.env.BASE_URL
const light = `${base}icon_light.svg`
const dark = `${base}icon_dark.svg`
</script>

<template>
  <header class="px-4 py-2 border-b border-main flex children:my-auto">
    <div class="flex flex-auto children:my-auto ws-nowrap">
      <div class="w-8 h-8">
        <img
          :src="light"
          class="w-full h-full m-auto dark-hidden"
          alt="Vite PWA Inspector logo"
          draggable="false"
        >
        <img
          :src="dark"
          class="w-full h-full m-auto light-hidden"
          alt="Vite PWA Inspector logo"
          draggable="false"
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

html.dark .light-hidden {
  display: unset;
}
html.dark .dark-hidden {
  display: none;
}
html.light .dark-hidden {
  display: unset;
}
html.light .light-hidden {
  display: none;
}
</style>
