import pc from 'picocolors'
import {
  DEV_PWA_ASSETS_NAME,
  DEV_READY_NAME,
  DEV_REGISTER_SW_NAME,
} from './constants'

export function checkForHtmlHead(html: string) {
  if (!html.includes('</head>')) {
    if (!html.includes('<body>')) {
      console.warn([
        '',
        pc.yellow('PWA WARNING:'),
        '</head> and <body> tags not found in the html, the service worker and web manifest will not be injected.',
      ].join('\n'))
      return html
    }
    else {
      console.warn([
        '',
        pc.yellow('PWA WARNING:'),
        '</head> not found in the html, adding it to the html tag: add empty <head></head> to your html to remove this warning.',
      ].join('\n'))
    }
    return html.replace('<body>', `<head>\n</head>\n<body>`)
  }

  return html
}

export function generateSWHMR() {
  // defer attribute: https://html.spec.whatwg.org/multipage/common-microsyntaxes.html#boolean-attributes
  return `
import.meta.hot.on('${DEV_REGISTER_SW_NAME}', ({ mode, inlinePath, registerPath, scope, swType = 'classic' }) => {
  if (mode == 'inline') {
    if('serviceWorker' in navigator) {
      navigator.serviceWorker.register(inlinePath, { scope, type: swType });
    }
  }
  else {
    const registerSW = document.createElement('script');
    registerSW.setAttribute('id', 'vite-plugin-pwa:register-sw');
    if (mode === 'script-defer') registerSW.setAttribute('defer', 'defer');
    registerSW.setAttribute('src', registerPath);
    document.head.appendChild(registerSW);
  }
});
import.meta.hot.on('${DEV_PWA_ASSETS_NAME}', ({ themeColor, links }) => {
  if (themeColor) {
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.content = themeColor.content;
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('name', 'theme-color');
      meta.setAttribute('content', themeColor.content);
      document.head.appendChild(meta);
    }
  }
  if (links) {
    links.map((l) => {
      const link = document.querySelector(\`link[href="\${l.href}"]\`) ?? document.createElement('link');
      if (l.id) link.setAttribute('id', l.id);
      else link.removeAttribute('id');
      link.setAttribute('rel', l.rel);
      link.setAttribute('href', l.href);
      if (l.media) link.setAttribute('media', l.media);
      else link.removeAttribute('media');
      if (l.sizes) link.setAttribute('sizes', l.sizes);
      else link.removeAttribute('sizes');
      if (l.type) link.setAttribute('type', l.type);
      else link.removeAttribute('type');
      if (!link.parentNode) document.head.appendChild(link);
    });
  }  
});  
function registerDevSW() {
  try {
    import.meta.hot.send('${DEV_READY_NAME}');
  } catch (e) {
    console.error('unable to send ${DEV_READY_NAME} message to register service worker in dev mode!', e);
  }
}
export default registerDevSW;
`
}
