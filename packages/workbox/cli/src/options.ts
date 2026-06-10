export type Strategy = 'generateSW' | 'injectManifest' | 'buildSW'
export type Engine = 'vite' | 'rolldown'

export interface CliFlags {
  root?: string
  config?: string
  outDir?: string
  engine?: Engine
  mode?: string
}

export interface ResolvedCliOptions {
  strategy: Strategy
  engine: Engine
  root: string
  outDir: string
  mode: string
  swSrc?: string
  swDest?: string
}

