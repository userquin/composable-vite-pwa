import type { PwaAppleSplashScreenImageProps } from '#build/pwa-icons/PwaAppleSplashScreenImage.js'
import { defineComponent, h } from 'vue'
import { useAppleSplashScreenPwaIcon } from '#pwa'

export default defineComponent<PwaAppleSplashScreenImageProps>({
  setup(props) {
    const { icon } = useAppleSplashScreenPwaIcon(props)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
