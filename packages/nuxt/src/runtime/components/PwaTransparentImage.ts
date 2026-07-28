import type { PwaTransparentImageProps } from '#build/pwa-icons/PwaTransparentImage.js'
import { defineComponent, h } from 'vue'
import { useTransparentPwaIcon } from '#pwa'

export default defineComponent<PwaTransparentImageProps>({
  setup(props) {
    const { icon } = useTransparentPwaIcon(props)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
