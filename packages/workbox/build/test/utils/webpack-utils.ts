import { createBundlerFixture } from './bundler-fixture-utils'

const webpackPackageJson = `{
  "name": "webpack-app",
  "type": "module",
  "version": "0.0.0",
  "private": true,
  "dependencies": {
    "@composable-vite-pwa/workbox-swkit": "workspace:*"
  },
  "devDependencies": {
    "@composable-vite-pwa/workbox-build": "workspace:*",
    "webpack": "catalog:webpack5"
  }
}
`

export function createFixture(prefix: string, use: (paths: { root: string, dist: string }) => Promise<void>) {
  return createBundlerFixture(prefix, webpackPackageJson, use)
}
