<script setup lang="ts">
import type { ScrollSpyHeader } from '../utils'
import { onMounted, shallowRef } from 'vue'
import { icons, manifest, screenshots, shortcuts } from '../state'
import ManifestScrollSpy from './ManifestScrollSpy.vue'

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

const showMinimumSafeArea = shallowRef(false)
</script>

<template>
  <div class="h-full relative overflow-hidden">
    <div class="manifest-container h-full overflow-y-auto py3 text-sm">
      <h1 class="text-lg font-bold mb-6 mx-4 flex items-center gap-2">
        <span>Manifest</span>
      </h1>

      <div v-if="!manifest" class="font-bold text-gray-500 dark:text-gray-400 italic pl-4">
        Loading web manifest configuration...
      </div>

      <div v-else class="flex flex-col gap-8">
        <section>
          <h2 id="identity" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Identity
          </h2>
          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">
          <div class="grid grid-cols-[150px_1fr] gap-y-3 gap-x-4 pl-4">
            <div class="text-gray-500 dark:text-gray-400">
              Name
            </div>
            <div class="font-mono">
              {{ manifest.name || '-' }}
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Short name
            </div>
            <div class="font-mono">
              {{ manifest.short_name || '-' }}
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Description
            </div>
            <div class="font-mono">
              {{ manifest.description || '-' }}
            </div>
          </div>
        </section>

        <section>
          <h2 id="presentation" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Presentation
          </h2>
          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">
          <div class="grid grid-cols-[150px_1fr] gap-y-3 gap-x-4 items-center pl-4">
            <div class="text-gray-500 dark:text-gray-400">
              Start URL
            </div>
            <div class="font-mono text-blue-600 dark:text-blue-400">
              <a :href="manifest.start_url" target="_blank">{{ manifest.start_url || '/' }}</a>
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Theme color
            </div>
            <div class="flex items-center gap-2 font-mono">
              <div
                v-if="manifest.theme_color"
                class="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                :style="{ backgroundColor: manifest.theme_color }"
              />
              {{ manifest.theme_color || '-' }}
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Background color
            </div>
            <div class="flex items-center gap-2 font-mono">
              <div
                v-if="manifest.background_color"
                class="w-4 h-4 rounded border border-gray-300 dark:border-gray-600"
                :style="{ backgroundColor: manifest.background_color }"
              />
              {{ manifest.background_color || '-' }}
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Orientation
            </div>
            <div class="font-mono">
              {{ manifest.orientation || '-' }}
            </div>

            <div class="text-gray-500 dark:text-gray-400">
              Display
            </div>
            <div class="font-mono">
              {{ manifest.display || 'standalone' }}
            </div>
          </div>
        </section>

        <section>
          <h2 id="icons" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Icons
          </h2>

          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div v-if="!icons" class="text-gray-500 dark:text-gray-400 pl-4">
            No icons configured in manifest.
          </div>

          <div v-else class="flex flex-col">
            <div class="px-4 mb-6 flex flex-col gap-2">
              <label class="flex items-center gap-2 cursor-pointer w-max">
                <input v-model="showMinimumSafeArea" type="checkbox" class="rounded border-gray-300 dark:border-gray-700">
                <span>Show only the minimum safe area for maskable icons</span>
              </label>
              <div class="text-gray-500 dark:text-gray-400">
                Need help? Read the <a href="https://web.dev/articles/maskable-icon" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">documentation on maskable icons</a>.
              </div>
            </div>

            <div
              v-for="(icon, idx) in icons"
              :key="idx"
              class="grid grid-cols-[150px_1fr] gap-y-4 gap-x-4 pl-4 mb-6 items-start"
            >
              <div class="text-gray-500 dark:text-gray-400 flex flex-col gap-1 mt-2">
                <span>{{ icon.sizes || '-' }}</span>
                <span>{{ icon.type || '-' }}</span>
                <span v-if="icon.purpose" class="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded w-max mt-1">
                  {{ icon.purpose }}
                </span>
              </div>
              <div class="flex">
                <div :class="{ 'mask-grid': showMinimumSafeArea }" class="rounded">
                  <img
                    :src="icon.src"
                    :alt="`Icon ${icon.sizes}`"
                    loading="lazy"
                    decoding="async"
                    class="max-w-[192px] max-h-[192px] block object-contain transition-opacity duration-300"
                    :class="{ 'mask-clip': showMinimumSafeArea }"
                  >
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 id="window-controls-overlay" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Window Controls Overlay
          </h2>

          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div class="px-4 flex flex-col gap-3">
            <div v-if="manifest.display_override?.includes('window-controls-overlay')" class="flex items-center gap-2">
              <span aria-hidden="true" class="block i-tabler:circle-check text-green-600 dark:text-green-500 w-5 h-5 shrink-0" />
              <span>
                Manifest has the <code class="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded font-mono text-xs">window-controls-overlay</code> value for the <a href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">display-override</a> field.
              </span>
            </div>
            <div v-else class="flex items-center gap-2">
              <span aria-hidden="true" class="block i-tabler:info-circle text-gray-500 dark:text-gray-400 w-5 h-5 shrink-0" />
              <span>
                Define <a href="https://developer.mozilla.org/en-US/docs/Web/Manifest/display_override" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">display-override</a> in the manifest to use the Window Controls Overlay API and customize your app's title bar.
              </span>
            </div>
            <div class="text-gray-500 dark:text-gray-400">
              Need help? Read <a href="https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/window-controls-overlay" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 hover:underline">Customize the window controls overlay of your PWA's title bar</a>.
            </div>
          </div>
        </section>

        <section>
          <h2 id="shortcuts" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Shortcuts
          </h2>

          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div v-if="!shortcuts || shortcuts.length === 0" class="text-gray-500 dark:text-gray-400 pl-4">
            No shortcuts configured in manifest.
          </div>

          <div v-else class="flex flex-col">
            <div
              v-for="(shortcut, idx) in shortcuts"
              :key="idx"
              class="mb-6 border-b border-gray-100 dark:border-gray-800 pb-8 last:border-0 last:pb-0"
            >
              <h3 class="text-base font-medium mb-4 mx-4">
                Shortcut #{{ idx + 1 }}
              </h3>

              <div class="grid grid-cols-[150px_1fr] gap-y-4 gap-x-4 pl-4 items-start">
                <template v-if="shortcut.name">
                  <div class="text-gray-500 dark:text-gray-400">
                    Name
                  </div>
                  <div>
                    {{ shortcut.name }}
                  </div>
                </template>

                <template v-if="shortcut.short_name">
                  <div class="text-gray-500 dark:text-gray-400">
                    Short name
                  </div>
                  <div>
                    {{ shortcut.short_name }}
                  </div>
                </template>

                <template v-if="shortcut.url">
                  <div class="text-gray-500 dark:text-gray-400">
                    URL
                  </div>
                  <div class="text-blue-600 dark:text-blue-400">
                    <a :href="shortcut.url" target="_blank" class="hover:underline">{{ shortcut.url }}</a>
                  </div>
                </template>

                <template v-if="shortcut.description">
                  <div class="text-gray-500 dark:text-gray-400">
                    Description
                  </div>
                  <div>
                    {{ shortcut.description }}
                  </div>
                </template>

                <template v-if="shortcut.icons && shortcut.icons.length > 0">
                  <template v-for="(icon, iconIdx) in shortcut.icons" :key="iconIdx">
                    <div class="text-gray-500 dark:text-gray-400 flex flex-col gap-1 mt-2">
                      <span>{{ icon.sizes || '-' }}</span>
                      <span>{{ icon.type || '-' }}</span>
                      <span v-if="icon.purpose" class="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded w-max mt-1">
                        {{ icon.purpose }}
                      </span>
                    </div>
                    <div class="flex mt-2">
                      <img
                        :src="icon.src"
                        :alt="`Shortcut icon ${icon.sizes}`"
                        loading="lazy"
                        decoding="async"
                        class="max-w-[192px] max-h-[192px] block object-contain rounded-sm"
                      >
                    </div>
                  </template>
                </template>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 id="screenshots" tabindex="-1" class="text-md font-semibold pb-2 mx-4 mb-0 flex items-center gap-2">
            Screenshots
          </h2>

          <hr class="mb-4 border-t border-gray-300 dark:border-gray-700">

          <div v-if="!screenshots || screenshots.length === 0" class="text-gray-500 dark:text-gray-400 pl-4">
            No screenshots configured in manifest.
          </div>

          <div v-else class="flex flex-col">
            <div
              v-for="(screenshot, idx) in screenshots"
              :key="idx"
              class="mb-6 border-b border-gray-100 dark:border-gray-800 pb-8 last:border-0 last:pb-0"
            >
              <h3 class="text-base font-medium mb-4 mx-4">
                Screenshot #{{ idx + 1 }}
              </h3>

              <div class="grid grid-cols-[150px_1fr] gap-y-4 gap-x-4 pl-4 items-start">
                <template v-if="screenshot.form_factor">
                  <div class="text-gray-500 dark:text-gray-400 mt-0.5">
                    Form factor
                  </div>
                  <div>
                    <span class="text-[10px] bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 px-1.5 py-0.5 rounded w-max font-mono">
                      {{ screenshot.form_factor }}
                    </span>
                  </div>
                </template>

                <template v-if="screenshot.label">
                  <div class="text-gray-500 dark:text-gray-400">
                    Label
                  </div>
                  <div>
                    {{ screenshot.label }}
                  </div>
                </template>

                <div class="text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                  <span>{{ screenshot.sizes || '-' }}</span>
                  <span>{{ screenshot.type || '-' }}</span>
                </div>
                <div class="flex">
                  <img
                    :src="screenshot.src"
                    :alt="screenshot.label || `Screenshot ${idx + 1}`"
                    loading="lazy"
                    decoding="async"
                    class="max-w-full max-h-[350px] block object-contain rounded-sm"
                  >
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
    <ManifestScrollSpy v-if="resolvedHeaders" :resolved-headers />
  </div>
</template>

<style scoped>
.mask-grid {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIj48L3JlY3Q+CjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNlZWVlZWUiPjwvcmVjdD4KPHJlY3QgeT0iNCIgeD0iNCIgd2lkdGg9IjQiIGhlaWdodD0iNCIgZmlsbD0iI2VlZWVlZSI+PC9yZWN0Pgo8L3N2Zz4=');
}

.mask-clip {
  clip-path: circle(40%);
}
</style>
