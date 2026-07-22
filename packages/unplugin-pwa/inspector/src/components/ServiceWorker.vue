<script setup lang="ts">
import type { ScrollSpyHeader } from '../utils'
import { onMounted, shallowRef } from 'vue'
import { swInfo } from '../state'
import ServiceWorkerScrollSpy from './ServiceWorkerScrollSpy.vue'

const resolvedHeaders = shallowRef<ScrollSpyHeader[] | undefined>()

onMounted(() => {
  const elements = document.querySelectorAll<HTMLHeadElement>('h2')
  const headers: ScrollSpyHeader[] = []
  for (const element of elements) {
    const id = element.getAttribute('id')
    if (!id) {
      continue
    }
    headers.push({
      id,
      element,
      link: `/#${id}/`,
    })
  }
  resolvedHeaders.value = headers
})
</script>

<template>
  <div class="h-full relative overflow-hidden">
    <div class="h-full overflow-y-auto py3 text-sm">
      <h1 id="service-worker" tabindex="-1" class="text-lg font-bold mb-6 mx-4 flex items-center gap-2">
        <span>Service Worker</span>
      </h1>

      <div v-if="!swInfo" class="font-bold text-gray-500 dark:text-gray-400 italic pl-4">
        Loading service worker info...
      </div>

      <div v-else class="flex flex-col gap-8">
        <section>
          <h2 id="info" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Info
          </h2>
          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">
          <div class="grid grid-cols-[190px_1fr] gap-y-3 gap-x-4 pl-4">
            <div class="text-gray-500 dark:text-gray-400">
              Enabled at build time
            </div>
            <div class="font-mono">
              {{ swInfo.buildEnabled ? 'Yes' : 'No' }}
            </div>
            <div class="text-gray-500 dark:text-gray-400">
              Enabled at development
            </div>
            <div class="font-mono">
              {{ swInfo.devEnabled ? 'Yes' : 'No' }}
            </div>
            <template v-if="swInfo.devEnabled">
              <div class="text-gray-500 dark:text-gray-400">
                Current type
              </div>
              <div class="font-mono">
                {{ swInfo.currentType || '--' }}
              </div>
            </template>
          </div>
        </section>

        <section>
          <h2 id="chunks" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Chunks
          </h2>
          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div v-if="!swInfo.currentType || !swInfo.chunks || swInfo.chunks.length === 0" class="text-gray-500 dark:text-gray-400 pl-4">
            No chunks available.
          </div>

          <div v-else class="px-4">
            <ul class="flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/50 dark:bg-[#121212]/50">
              <li
                v-for="(chunk, idx) in swInfo.chunks"
                :key="`${swInfo.currentType}-${idx}`"
                class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span aria-hidden="true" class="block i-tabler:script text-gray-400 dark:text-gray-500 w-4 h-4 shrink-0" />
                <span class="font-mono text-xs text-gray-700 dark:text-gray-300 truncate" :title="chunk">
                  {{ chunk }}
                </span>
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2 id="dependencies" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Dependencies
          </h2>
          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div v-if="!swInfo.currentType || !swInfo.dependencies || swInfo.dependencies.length === 0" class="text-gray-500 dark:text-gray-400 pl-4">
            No dependencies available.
          </div>

          <div v-else class="px-4">
            <ul class="flex flex-col border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50/50 dark:bg-[#121212]/50">
              <li
                v-for="(dependency, idx) in swInfo.dependencies"
                :key="`${swInfo.currentType}-${idx}`"
                class="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 dark:border-gray-800 last:border-0 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span aria-hidden="true" class="block i-tabler:script text-gray-400 dark:text-gray-500 w-4 h-4 shrink-0" />
                <span class="font-mono text-xs text-gray-700 dark:text-gray-300 truncate" :title="dependency">
                  {{ dependency }}
                </span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
    <ServiceWorkerScrollSpy v-if="resolvedHeaders" :resolved-headers />
  </div>
</template>
