import path from 'node:path'
import { createTypeDocApp } from './typedoc-markdown.mjs'

const __dirname = path.dirname(new URL(import.meta.url).pathname)

createTypeDocApp({
  textContentMappings: {
    'title.indexPage': 'API Reference',
    'title.memberPage': '{name}',
  },
  tsconfig: path.resolve(__dirname, './typedoc.tsconfig.json'),
  // entryPointStrategy: 'packages',
  categorizeByGroup: true,
  githubPages: false,
  readme: 'none',
  indexFormat: 'table',
  disableSources: true,
  plugin: ['typedoc-plugin-markdown', 'typedoc-vitepress-theme'],
  useCodeBlocks: true,
  entryPoints: [
    '../build/src/types.ts',
    '../build/src/config/types.ts',
    '../build/src/build/types.ts',
    '../build/src/build/vite/types.ts',
    '../build/src/build/rolldown/types.ts',
    '../build/src/build/vite/plugin/types.ts',
    '../swkit/src/background-sync/types.ts',
    '../swkit/src/broadcast-update/types.ts',
    '../swkit/src/cacheable-response/types.ts',
    '../swkit/src/core/types.ts',
    '../swkit/src/expiration/types.ts',
    '../swkit/src/precaching/types.ts',
    '../swkit/src/routing/types.ts',
    '../swkit/src/streams/types.ts',
    '../swkit/src/types.ts',
  ],
}).then(app => app.build())
