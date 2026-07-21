<script setup lang="ts">
import { pwaConfiguration, swType, version } from '../state'
</script>

<template>
  <div class="px-4 py-3 border-b border-main flex flex-col gap-2.5 text-xs">
    <div class="flex items-center justify-between">
      <span class="text-gray-500 dark:text-gray-400">Version</span>
      <span class="font-mono text-teal7 bg-teal7:10 dark:bg-teal-900/30 dark:text-teal-400 px-1.5 py-0.5 rounded font-medium">
        {{ version || '--' }}
      </span>
    </div>

    <div class="flex items-start justify-between gap-2">
      <span class="text-gray-500 dark:text-gray-400 shrink-0">Strategy</span>
      <span class="font-mono text-gray-700 dark:text-gray-300 text-right">
        {{ pwaConfiguration?.strategy || '--' }}
      </span>
    </div>

    <div class="flex items-start justify-between gap-2">
      <span class="text-gray-500 dark:text-gray-400 shrink-0">Type</span>
      <span class="font-mono text-gray-700 dark:text-gray-300 text-right">
        {{ swType || '--' }}
      </span>
    </div>
  </div>
</template>
