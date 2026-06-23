import pc from 'picocolors'

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
