import { randomUUID } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { test as base } from 'vitest'

// Helper interno para no repetir la lógica de creación/borrado
async function createSandbox(fixtureName: string, prefix: string, use: (path: string) => Promise<void>) {
  const id = randomUUID()
  const fixtureSource = path.resolve(import.meta.dirname, `fixtures/${fixtureName}`)
  const tempPath = path.resolve(import.meta.dirname, `fixtures/${prefix}-${id}`)

  try {
    await fs.mkdir(tempPath, { recursive: true })
    await fs.cp(fixtureSource, tempPath, { recursive: true })
    await use(tempPath)
  }
  finally {
    await fs.rm(tempPath, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    }).catch((err) => {
      console.error(`Failed to cleanup sandbox at ${tempPath}:`, err)
    })
  }
}

export const testGenerateSW = base.extend<{ sandbox: string }>({
  sandbox: async (_, use) => {
    await createSandbox('fixture-generate-sw', 'gsw', use)
  },
})

export const testInjectManifest = base.extend<{ sandbox: string }>({
  sandbox: async (_, use) => {
    await createSandbox('fixture-inject-manifest', 'im', use)
  },
})
