import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

export async function createFixture(prefix: string, use: (paths: { root: string, dist: string }) => Promise<void>) {
  let root: string | undefined
  try {
    root = await fs.mkdtemp(path.resolve(process.cwd(), 'test', 'temp-fixtures', `${prefix}-pwa-`))
    const src = path.resolve(root, 'src')
    const dist = path.resolve(root, 'dist')

    await fs.mkdir(src)

    const indexContent = 'document.body.textContent = "PWA compiler smoke"\n'
    const swContent = `import { clientsClaim } from "@composable-vite-pwa/workbox-swkit/core"
  import { precacheAndRoute } from "@composable-vite-pwa/workbox-swkit/precaching"
  
  globalThis.skipWaiting()
  clientsClaim()
  precacheAndRoute(globalThis.__WB_MANIFEST)
  `
    const rspackPackageJson = `{
    "name": "rsbuild-app",
    "type": "module",
    "version": "0.0.0",
    "private": true,
    "dependencies": {
      "@composable-vite-pwa/workbox-swkit": "workspace:*"
    },
    "devDependencies": {
      "@composable-vite-pwa/workbox-build": "workspace:*",
      "@rsbuild/core": "catalog:rsbuild"
    }
  }
  `
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
    const writePromises = [
      fs.writeFile(path.resolve(src, 'index.js'), indexContent),
      fs.writeFile(path.resolve(src, 'sw.js'), swContent, 'utf-8'),
    ]
    if (prefix === 'rspack') {
      writePromises.push(fs.writeFile(path.resolve(root, 'package.json'), rspackPackageJson, 'utf-8'))
    }
    else {
      writePromises.push(fs.writeFile(path.resolve(root, 'package.json'), webpackPackageJson, 'utf-8'))
    }
    await Promise.all(writePromises)

    await use({ root, dist })
  }
  finally {
    if (root) {
      await fs.rm(root, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      }).catch((err) => {
        console.error(`Failed to cleanup sandbox at ${root}:`, err)
      })
    }
  }
}
