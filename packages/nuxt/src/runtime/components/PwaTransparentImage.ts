import type { PwaTransparentImageProps } from '#build/pwa-icons/PwaTransparentImage'
import { defineComponent, h } from 'vue'
import { useTransparentPwaIcon } from '#pwa'

export default defineComponent<PwaTransparentImageProps>({
  name: 'PwaTransparentImage',
  inheritAttrs: false,
  setup(_, { attrs = {} }) {
    const { icon } = useTransparentPwaIcon(attrs as unknown as PwaTransparentImageProps)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
