function VirtualPlugin() {
  /** @type {import('vite').Plugin} */
  return {
    name: 'virtual-sw-plugin',
    resolveId(id) {
      return id === 'virtual:sw-chunk' ? '\0virtual:sw-chunk' : undefined
    },
    load(id) {
      if (id === '\0virtual:sw-chunk') {
        return `export const message2 = 'Virtual SW Chunk';
export function sayHello2(msg) {
  return \`Hello \${message2} from virtual chunk! You said: \${msg}\`
}          
`
      }
    },
  }
}

export { VirtualPlugin }
