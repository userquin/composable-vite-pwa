import type { PwaAppleSplashScreenImageProps } from '#build/pwa-icons/PwaAppleSplashScreenImage.js'
import { defineComponent, h } from 'vue'
import { useApplePwaIcon } from '#pwa'

export default defineComponent<PwaAppleSplashScreenImageProps>({
  name: 'PwaAppleImage',
  inheritAttrs: false,
  setup(_, { attrs = {} }) {
    const { icon } = useApplePwaIcon(attrs as unknown as PwaAppleSplashScreenImageProps)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
