import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import * as v from 'valibot'
import { AsyncManifestOptionsSchema } from './utils'

export type AsyncInjectManifestOptionsSchemaType = v.InferInput<typeof AsyncInjectManifestOptionsSchema>

export const AsyncInjectManifestOptionsSchema = v.pipeAsync(
  v.strictObjectAsync({
    ...AsyncManifestOptionsSchema.entries,
    /**
     * The string to find inside of the `swSrc` file. Once found, it will be
     * replaced by the generated precache manifest.
     * @default "self.__WB_MANIFEST"
     */
    injectionPoint: v.optionalAsync(v.string(), 'self.__WB_MANIFEST'),
    /**
     * The path and filename of the service worker file that will be read during
     * the build process, relative to the current working directory.
     */
    swSrc: v.string(),

    /**
     * The path and filename of the service worker file that will be created by
     * the build process, relative to the current working directory. It must end
     * in '.js'.
     */
    swDest: v.pipeAsync(
      v.string(),
      v.endsWith('.js', 'invalid-sw-dest-js-ext'),
    ),

    /**
     * The local directory you wish to match `globPatterns` against. The path is
     * relative to the current directory.
     */
    globDirectory: v.string(),
  }),
  v.forwardAsync(
    v.checkAsync(
      async (input) => {
        const swSrc = path.resolve(process.cwd(), input.swSrc)
        return await fs.lstat(swSrc).then(stats => stats.isFile()).catch(() => false)
      },
      'invalid-sw-src',
    ),
    ['swSrc'],
  ),
  v.forwardAsync(
    v.checkAsync(
      async (input) => {
        const swDestParent = path.dirname(path.resolve(process.cwd(), input.swDest))
        return await fs.lstat(swDestParent).then(stats => stats.isDirectory()).catch(() => false)
      },
      'invalid-sw-dest',
    ),
    ['swDest'],
  ),
  v.forwardAsync(
    v.checkAsync(
      async (input) => {
        return await fs.lstat(input.globDirectory).then(stats => stats.isDirectory()).catch(() => false)
      },
      'glob-directory-invalid',
    ),
    ['globDirectory'],
  ),
)
