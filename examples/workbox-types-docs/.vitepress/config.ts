import { defineConfig } from 'vitepress'
import { sidebar } from './api'

export default defineConfig({
  title: 'Workbox Types',
  description: 'API reference generated from the @composable-vite-pwa/workbox-types JSON metadata',
  themeConfig: {
    nav: [{ text: 'API Reference', link: '/api/' }],
    sidebar: { '/api/': sidebar() },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/userquin/composable-vite-pwa' },
    ],
  },
})
