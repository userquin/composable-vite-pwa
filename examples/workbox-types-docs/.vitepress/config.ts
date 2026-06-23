import { defineConfig } from 'vitepress'
import { sidebar } from './api'

export default defineConfig({
  title: 'Workbox Types',
  description: 'API reference generated from the @composable-vite-pwa/workbox-types per-package JSON metadata',
  // Upstream Workbox JSDoc embeds links to the old Google docs paths, which are dead
  // here. This is a generated-content testbed; the real docs repo owns link policy.
  ignoreDeadLinks: true,
  themeConfig: {
    search: { provider: 'local' },
    nav: [{ text: 'API Reference', link: '/api/' }],
    sidebar: { '/api/': sidebar() },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/userquin/composable-vite-pwa' },
    ],
  },
})
