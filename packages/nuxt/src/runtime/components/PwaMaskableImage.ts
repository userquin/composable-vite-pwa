import type { PwaMaskableImageProps } from '#build/pwa-icons/PwaMaskableImage'
import { defineComponent, h } from 'vue'
import { useMaskablePwaIcon } from '#pwa'

export default defineComponent<PwaMaskableImageProps>({
  name: 'PwaMaskableImage',
  inheritAttrs: false,
  setup(_, { attrs = {} }) {
    const { icon } = useMaskablePwaIcon(attrs as unknown as PwaMaskableImageProps)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
