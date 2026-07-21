<script setup lang="ts">
import { onMounted } from 'vue'
import InspectorHero from './components/InspectorHero.vue'
import NavTabs from './components/NavTabs.vue'
import PWAInfo from './components/PWAInfo.vue'

onMounted(async () => {
  await import('./api').then(({ loadPWAConfiguration }) => loadPWAConfiguration())
})
</script>

<template>
  <div class="h-full w-full grid grid-cols-[1fr_minmax(210px,auto)] grid-rows-[min-content_min-content_1fr] gap-x-0 of-hidden bg-white dark:bg-[#080808] text-gray-800 dark:text-gray-200">
    <InspectorHero />
    <PWAInfo class="border-l border-main row-span-2" />
    <NavTabs />
    <div class="col-span-2 h-full of-hidden">
      <Suspense>
        <RouterView />
        <template #fallback>
          Loading...
        </template>
      </Suspense>
    </div>
  </div>
</template>
