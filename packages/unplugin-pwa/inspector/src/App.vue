<script setup lang="ts">
import { onMounted } from 'vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import ErrorBoundaryError from './components/ErrorBoundaryError.vue'
import InspectorHero from './components/InspectorHero.vue'
import NavTabs from './components/NavTabs.vue'
import PWAInfo from './components/PWAInfo.vue'
import { ready } from './state'

onMounted(async () => {
  await import('./api').then(({ loadPWAConfiguration }) => loadPWAConfiguration())
  ready.value = true
})
</script>

<template>
  <div class="h-full w-full grid grid-cols-[1fr_minmax(210px,auto)] grid-rows-[min-content_min-content_1fr] gap-x-0 of-hidden bg-white dark:bg-[#080808] text-gray-800 dark:text-gray-200">
    <InspectorHero />
    <PWAInfo class="border-l border-main row-span-2" />
    <NavTabs />
    <div class="col-span-2 h-full of-hidden">
      <ErrorBoundary>
        <Suspense>
          <RouterView />
          <template #fallback>
            Loading...
          </template>
        </Suspense>
        <template #error="{ clearError }">
          <ErrorBoundaryError @clear-error="clearError" />
        </template>
      </ErrorBoundary>
    </div>
  </div>
</template>
