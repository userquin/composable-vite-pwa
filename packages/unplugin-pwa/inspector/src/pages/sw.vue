<script setup lang="ts">
import { onBeforeMount } from 'vue'
import { loadSWInfo } from '../api'
import ServiceWorker from '../components/ServiceWorker.vue'

onBeforeMount(async () => {
  await loadSWInfo()
})
</script>

<template>
  <ServiceWorker />
</template>
