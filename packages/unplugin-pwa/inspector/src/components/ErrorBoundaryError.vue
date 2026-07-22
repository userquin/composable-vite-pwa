<script setup lang="ts">
import { error } from '../state'

const emit = defineEmits<{
  (evt: 'clearError'): void
}>()
</script>

<template>
  <div class="h-full w-full flex items-center justify-center p-8">
    <div class="grid grid-cols-[auto_1fr] p-4 gap-x-4 gap-y-2 items-start rounded-md border border-[#dc2626] dark:border-[#fca5a5]">
      <span aria-hidden="true" class="block i-tabler:alert-triangle text-4xl text-[#dc2626] dark:text-[#fca5a5] row-span-3 self-start mt-1" />

      <p class="text-lg font-semibold text-[#dc2626] dark:text-[#fca5a5] m-0 py-2">
        An error occurred while loading the page.
      </p>

      <p v-if="error" class="text-sm text-[#dc2626] dark:text-[#fca5a5] m-0">
        {{ error?.message }}
      </p>

      <button class="mt-2 px-4 py-2 justify-self-end font-semibold text-white dark:text-[#7f1d1d] bg-[#dc2626] dark:bg-[#fca5a5] hover:bg-red-700 dark:hover:bg-red-400 transition-colors rounded-md" @click="emit('clearError')">
        Clear Error
      </button>
    </div>
  </div>
</template>
