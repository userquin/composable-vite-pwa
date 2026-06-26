import { getPackages, symbolIndex } from '../.vitepress/api'

// lowercase, url-safe anchor id (fragments are case-sensitive on static hosts)
const anchorId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export default {
  load() {
    const flat = symbolIndex()
    const groups: Record<string, typeof flat> = {}
    for (const s of flat) (groups[s.pkg] ??= []).push(s)

    const packages = getPackages()

    return {
      total: flat.length,
      packages: packages.map(p => ({
        label: p.label,
        slug: p.slug,
        symbolCount: p.symbols.length,
      })),
      // sorted by fully-qualified package, matching the sidebar order
      groups: Object.keys(groups).sort((a, b) => a.localeCompare(b)).map((pkg) => {
        const p = packages.find(p => p.label === pkg)
        return {
          pkg,
          id: anchorId(pkg),
          packageSlug: p?.slug ?? pkg,
          items: groups[pkg],
        }
      }),
    }
  },
}
