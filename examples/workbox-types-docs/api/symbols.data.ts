import { symbolIndex } from '../.vitepress/api'

export default {
  load() {
    const flat = symbolIndex()
    const groups: Record<string, typeof flat> = {}
    for (const s of flat) (groups[s.module] ??= []).push(s)
    return {
      total: flat.length,
      groups: Object.entries(groups).map(([module, items]) => ({ module, items })),
    }
  },
}
