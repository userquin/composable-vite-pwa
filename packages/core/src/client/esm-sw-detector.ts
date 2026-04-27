type Browser
  = | 'chrome'
    | 'edge-chromium'
    | 'safari'
    | 'firefox'
    | 'opera'
    | 'chrome-android'
    | 'ios-safari'
    | 'samsung'
    | 'opera-mobile'
    | 'uc-browser-android'
    | 'chromium-webview'
    | 'firefox-android'
    | 'qq-browser'

type OS = 'iOS' | 'Android' | 'Mac OS'

type SWFeatures = (versions: number[], os?: OS) => boolean

const chromiumCheck: SWFeatures = v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 91

// https://caniuse.com/?search=service+worker
const allowedBrowsers: Record<Browser, SWFeatures> = {
  'chrome': chromiumCheck,
  'edge-chromium': chromiumCheck,
  'safari': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 15,
  'firefox': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 145,
  'opera': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 77,
  'chrome-android': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 147,
  'ios-safari': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 15,
  'samsung': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 16,
  'opera-mobile': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 80,
  'uc-browser-android': v => v.length > 1 && !Number.isNaN(v[0]) && !Number.isNaN(v[1]) && (v[0] >= 16 || (v[0] >= 15 && v[1] >= 5)),
  'chromium-webview': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 147,
  'firefox-android': v => v.length > 0 && !Number.isNaN(v[0]) && v[0] >= 150,
  'qq-browser': v => v.length > 1 && !Number.isNaN(v[0]) && !Number.isNaN(v[1]) && (v[0] >= 15 || (v[0] >= 14 && v[1] >= 9)),
}

type Rule = (userAgent: string, os?: OS) => RegExpExecArray | null

const chromeRegex = /(?!Chrom.*OPR)Chrom(?:e|ium)\/([\d.]+)(:?\s|$)/
const edgeRegex = /EdgA?\/([\d.]+)/
const safariRegex = /Version\/.*Safari/
const safariVersionRegex = /Version\/([\d._]+)/
const firefoxVersionRegex = /Firefox\/([\d.]+)(?:\s|$)/
const operaRegex = /(Opera|OPR)\/([\d.]+)/
const samsungRegex = /SamsungBrowser\/([\d.]+)/
const webviewRegex = /wv\).*Chrom(?:e|ium)\/([\d.]+)/
const operaMobileRegex = /Mobile/
const ucBrowserRegex = /UCBrowser\/([\d.]+)/
const qqRegex = /(MQQBrowser|QQBrowser)\/([\d.]+)/i

const rules: Record<Browser, Rule> = {
  'chrome': (userAgent, os) => (!os || os !== 'Android') ? chromeRegex.exec(userAgent) : null,
  'edge-chromium': userAgent => edgeRegex.exec(userAgent),
  'safari': (userAgent, os) => {
    return os === 'Mac OS' && safariRegex.test(userAgent) ? safariVersionRegex.exec(userAgent) : null
  },
  'firefox': userAgent => firefoxVersionRegex.exec(userAgent),
  'opera': userAgent => operaMobileRegex.test(userAgent) ? null : operaRegex.exec(userAgent),
  'chrome-android': (userAgent, os) => os === 'Android' ? chromeRegex.exec(userAgent) : null,
  'ios-safari': (userAgent, os) => os === 'iOS' ? safariVersionRegex.exec(userAgent) : null,
  'samsung': userAgent => samsungRegex.exec(userAgent),
  'opera-mobile': userAgent => operaMobileRegex.test(userAgent) ? operaRegex.exec(userAgent) : null,
  'uc-browser-android': (userAgent, os) => os === 'Android' && operaMobileRegex.test(userAgent) ? ucBrowserRegex.exec(userAgent) : null,
  'chromium-webview': (userAgent, os) => os === 'Android' ? webviewRegex.exec(userAgent) : null,
  'firefox-android': (userAgent, os) => os === 'Android' ? firefoxVersionRegex.exec(userAgent) : null,
  'qq-browser': userAgent => qqRegex.exec(userAgent),
}

export function isSWModuleSupported(userAgent = navigator.userAgent): boolean {
  if (!userAgent)
    return false

  let os: OS | undefined
  if (/iP(?:hone|od|ad)/.test(userAgent))
    os = 'iOS'
  else if (/Android/.test(userAgent))
    os = 'Android'
  else if (/Macintosh/.test(userAgent))
    os = 'Mac OS'

  if (os === 'iOS') {
    const match = rules['ios-safari'](userAgent, os)
    return match
      ? allowedBrowsers['ios-safari'](
          match[1].split(/[._]/).map(v => Number.parseInt(v, 10)),
          os,
        )
      : false
  }

  for (const [name, rule] of Object.entries(rules)) {
    if (name === 'ios-safari')
      continue

    const match = rule(userAgent, os)
    if (match) {
      const config = allowedBrowsers[name as Browser]
      return config(
        match[1].split(/[._]/).map(v => Number.parseInt(v, 10)),
        os,
      )
    }
  }

  return false
}
