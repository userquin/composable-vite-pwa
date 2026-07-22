import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'

import '@unocss/reset/tailwind.css'
import 'uno:icons.css'
import './styles/main.css'
import 'uno.css'

createApp(App).use(router).mount('#vite-pwa-inspector')
