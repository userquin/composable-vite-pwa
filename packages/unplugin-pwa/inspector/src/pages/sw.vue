<script setup lang="ts">
import { onUnmounted } from 'vue'
import { loadSWInfo } from '../api'
import ServiceWorker from '../components/ServiceWorker.vue'
import { currentSWInfo, swReady } from '../state'

onUnmounted(() => {
  swReady.value = false
  currentSWInfo.value = undefined
})

await loadSWInfo()
swReady.value = true
</script>

<template>
  <ServiceWorker />
</template>
