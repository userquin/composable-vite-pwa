import { DEV_SW_VIRTUAL } from '../../constants'

export function injectHmrScript(
  html: string,
  base: string,
) {
  const path = `${base.endsWith('/') ? base : `${base}/`}${DEV_SW_VIRTUAL.slice(1)}`

  return html.replace(
    '</body>',
    `<script id="unplugin-pwa:register-dev-sw" type="module">
import { registerDevSW } from '${path}';
registerDevSW();
</script>
</body>`,
  )
}
