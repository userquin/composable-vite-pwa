<script setup lang="ts">
import type { ScrollSpyHeader } from '../utils'
import { shallowRef, useTemplateRef, watch } from 'vue'
import { useActiveAnchor } from '../utils'

const { resolvedHeaders } = defineProps<{
  resolvedHeaders: ScrollSpyHeader[]
}>()

const container = useTemplateRef('container')
const marker = useTemplateRef('marker')

const spyKey = 'vite-pwa-inspector:sw:spy-pinned'

const isPinned = shallowRef(localStorage.getItem(spyKey) === 'true')
watch(isPinned, (val) => {
  localStorage.setItem(spyKey, String(val))
})

function togglePin() {
  isPinned.value = !isPinned.value
}

const { goTo } = useActiveAnchor(resolvedHeaders, container, marker)
/* to test --scrollbar add this to style block: added at useActiveAnchor::onMounted
.sw-spy:before {
  content: counter(val) "px";
  counter-reset: val tan(atan2(var(--scrollbar),1px));
}
*/
</script>

<template>
  <nav
    ref="container"
    aria-labelledby="sw-on-this-page"
    class="sw-spy absolute top-[0.5rem] z-10"
    :class="!isPinned ? 'group' : ''"
    style="right: var(--scrollbar, 17px); width: calc(210px - var(--scrollbar, 17px))"
  >
    <div
      class="relative pr-2 pl-3 pb-2 bg-white dark:bg-[#080808] border-l border-main"
    >
      <div
        class="absolute left-[-1px] top-[36px] w-[2px] bg-white dark:bg-[#080808] transition-[height] duration-200 ease-in-out z-1"
        :class="isPinned ? 'h-0' : 'h-[calc(100%-36px)] group-hover:h-0'"
      />

      <div
        ref="marker"
        class="absolute bg-blue-600 dark:bg-blue-400 top-32px left-[-1px] z-0 w-[2px] h-18px rounded transition-opacity duration-200"
        :class="!isPinned ? 'opacity-0! group-hover:opacity-100!' : ''"
      />
      <div class="flex items-center justify-between h-[32px] mb-1">
        <h2
          id="sw-on-this-page"
          class="text-sm font-semibold m-0 text-gray-500 dark:text-gray-400"
        >
          On this service worker
        </h2>
        <button
          role="switch"
          :title="isPinned ? 'Unpin sidebar' : 'Pin sidebar'"
          class="flex items-center justify-center w-6 h-6 rounded transition-colors duration-200"
          :class="isPinned ? 'hover:bg-blue-50 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400' : 'hover:bg-gray-100 text-gray-400 dark:hover:bg-gray-700'"
          @click="togglePin"
        >
          <span
            aria-hidden="true"
            class="block w-4 h-4"
            :class="isPinned ? 'i-tabler:pinned' : 'i-tabler:pin'"
          />
        </button>
      </div>

      <div
        class="overflow-hidden transition-opacity duration-200 ease-in-out"
        :class="isPinned ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none h-0 group-hover:opacity-100 group-hover:pointer-events-auto group-hover:h-auto'"
      >
        <ul class="flex flex-col">
          <li>
            <a href="/#info" class="block h-[32px] leading-[32px] text-[14px] font-normal truncate text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 [&.active]:text-blue-600 dark:[&.active]:text-blue-400" @click="goTo($event, 'info')">Info</a>
          </li>
          <li>
            <a href="/#chunks" class="block h-[32px] leading-[32px] text-[14px] font-normal truncate text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 [&.active]:text-blue-600 dark:[&.active]:text-blue-400" @click="goTo($event, 'chunks')">Chunks</a>
          </li>
          <li>
            <a href="/#dependencies" class="block h-[32px] leading-[32px] text-[14px] font-normal truncate text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 [&.active]:text-blue-600 dark:[&.active]:text-blue-400" @click="goTo($event, 'dependencies')">Dependencies</a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>
