import type { PwaFaviconImageProps } from '#build/pwa-icons/PwaFaviconImage'
import { defineComponent, h } from 'vue'
import { useFaviconPwaIcon } from '#pwa'

export default defineComponent<PwaFaviconImageProps>({
  name: 'PwaFaviconImage',
  inheritAttrs: false,
  setup(_, { attrs = {} }) {
    const { icon } = useFaviconPwaIcon(attrs as unknown as PwaFaviconImageProps)
    return () => {
      const data = icon.value
      if (!data)
        return

      return h('img', data)
    }
  },
})
