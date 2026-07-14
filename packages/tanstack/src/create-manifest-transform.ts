const regexp = /\.html$/

export function createManifestTransform(
  base: string,
): import('@composable-vite-pwa/workbox-build/types').ManifestTransform {
  return async (entries) => {
    for (const e of entries) {
      if (!e.url.endsWith('.html')) {
        continue
      }
      const url = e.url.startsWith('/') ? e.url.slice(1) : e.url
      if (url === 'index.html') {
        e.url = base
      }
      else {
        let parts = url.split('/')
        if (parts.length > 1 && parts[parts.length - 1] === 'index.html') {
          parts = parts.slice(0, parts.length - 1)
        }
        else {
          parts[parts.length - 1] = parts[parts.length - 1]!.replace(regexp, '')
        }
        e.url = parts.length > 1 ? parts.slice(0, parts.length - 1).join('/') : parts[0] as string
      }
    }

    return { manifest: entries, warnings: [] }
  }
}
