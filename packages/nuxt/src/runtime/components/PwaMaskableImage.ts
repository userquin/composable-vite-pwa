import type { PwaMaskableImageProps } from '#build/pwa-icons/PwaMaskableImage.js'
import { defineComponent, h } from 'vue'
import { useMaskablePwaIcon } from '#pwa'

export default defineComponent<PwaMaskableImageProps>({
  setup(props) {
    const { icon } = useMaskablePwaIcon(props)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
