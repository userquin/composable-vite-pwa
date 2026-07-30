import type { PwaAppleSplashScreenImageProps } from '#build/pwa-icons/PwaAppleSplashScreenImage.js'
import { defineComponent, h } from 'vue'
import { useAppleSplashScreenPwaIcon } from '#pwa'

export default defineComponent<PwaAppleSplashScreenImageProps>({
  name: 'PwaAppleSplashScreenImage',
  inheritAttrs: false,
  setup(_, { attrs = {} }) {
    const { icon } = useAppleSplashScreenPwaIcon(attrs as unknown as PwaAppleSplashScreenImageProps)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
