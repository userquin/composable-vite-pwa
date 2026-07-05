import type { Config } from '@react-router/dev/config'
import process from 'node:process'
import { ReactRouterPWAPreset } from '@composable-vite-pwa/react-router/preset'

const spa = process.env.SPA === 'true'

export default {
  // Config options...
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: !spa,
  prerender: spa ? undefined : ['/'],
  presets: [ReactRouterPWAPreset()],
} satisfies Config
