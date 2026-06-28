/* eslint-disable unused-imports/no-unused-vars */
import DefaultTheme from 'vitepress/theme'
import './style.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router, siteData }: { app: any, router: any, siteData: any }) {
    // Wait for the DOM to be ready
    if (typeof window !== 'undefined') {
      document.addEventListener('click', (e) => {
        const tr = (e.target as HTMLElement).closest('.vp-doc table.symbol-table tbody tr')
        if (tr) {
          const link = tr.querySelector('td:first-child a')
          if (link) {
            const href = link.getAttribute('href')
            if (href && !href.startsWith('#')) {
              // Use router if available, else fallback to window.location
              if (router) {
                router.go(href)
              }
              else {
                window.location.href = href
              }
            }
          }
        }
      })
    }
  },
}
