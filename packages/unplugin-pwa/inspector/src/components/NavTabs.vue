<script setup lang="ts">
</script>

<template>
  <nav aria-label="Inspector Navigation" class="w-full border-b border-main flex flex-row">
    <div class="of-hidden">
      <div class="py-2 flex flex-row gap-1 px-2">
        <!-- Main Web Manifest route -->
        <RouterLink
          to="/"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          active-class="text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 font-medium"
        >
          <span aria-hidden="true" class="block i-tabler:file w-5 h-5" />
          <span>Manifest</span>
        </RouterLink>

        <!-- New Service Worker route -->
        <RouterLink
          to="/sw"
          class="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          active-class="text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 font-medium"
        >
          <span aria-hidden="true" class="block i-mdi:gear w-5 h-5" />
          <span>Service Worker</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
