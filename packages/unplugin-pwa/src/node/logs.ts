import pc from 'picocolors'
import { INSPECTOR_BASE_PATH } from './constants'

export const inspectorWithInjectManifestWarning = [
  `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('Vite PWA Inspector won\'t work as expected')}:\n`,
  `You are using ${pc.cyan('inject-manifest')} strategy, your service worker is ${pc.cyan('static')}.`,
  `If you want to see ${pc.cyan('Vite PWA Inspector')}, you can:`,
  `  - use hard refresh when opening ${pc.cyan('Vite PWA Inspector')} page to bypass the service worker interception or`,
  `  - you can add ${pc.green(`'${INSPECTOR_BASE_PATH}'`)} to your ${pc.cyan('NavigationRoute denylist option')}:`,
  `    ${pc.green('registerRoute(new NavigationRoute(createHandlerBoundToURL(\'index.html\'), { denylist: [/^\\/__unplugin_pwa_inspector/] }))')}\n`,
].join('\n')
