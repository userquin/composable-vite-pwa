import type { PwaFaviconImageProps } from '#build/pwa-icons/PwaFaviconImage.js'
import { defineComponent, h } from 'vue'
import { useFaviconPwaIcon } from '#pwa'

export default defineComponent<PwaFaviconImageProps>({
  setup(props) {
    const { icon } = useFaviconPwaIcon(props)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
