import { defineConfig } from 'vitepress'
import typedocSidebar from '../api/typedoc-sidebar.json'

export default defineConfig({
  title: 'workbox-types',
  description: 'API reference for @composable-vite-pwa/workbox',
  themeConfig: {
    sidebar: [{ text: 'API Reference', items: typedocSidebar }],
  },
})
