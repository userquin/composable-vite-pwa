import type { GenerateSWOptions, InjectManifestOptions, SWType } from '../types'

export interface BuildSWOptions<T extends SWType> {
  swType: T
}

export interface BuildGenerateSWOptions<T extends SWType> extends BuildSWOptions<T> {
  generateSW: GenerateSWOptions<T>
}

export interface ServiceWorkerOptions extends InjectManifestOptions {

}

export interface BuildInjectManifestSWOptions<T extends SWType> extends BuildSWOptions<T> {
  injectManifest: ServiceWorkerOptions
}
