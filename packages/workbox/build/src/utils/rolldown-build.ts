import fs from 'node:fs/promises'
import path from 'node:path'
import MagicString from 'magic-string'
import { rolldown } from 'rolldown'

export async function buildClassicSW(
  rootDir: string,
  swName: string,
  tempSwName: string,
  inline: boolean,
  sourcemap: boolean,
  define: import('rolldown').TransformOptions['define'],
  filePaths: string[],
  classicWorkboxRuntimeCompatible: boolean,
  workboxClassicFileForSourceMap?: string,
) {
  const workboxAssetName = `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}-[hash].js`
  const workboxChunkName = `workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}`
  const workboxFile = path.resolve(rootDir, `${workboxChunkName}.js`)
  const instance = await rolldown({
    input: inline ? tempSwName : `${workboxChunkName}.js`,
    platform: 'browser',
    transform: { define },
  })
  const { output } = await instance.write({
    sourcemap,
    comments: {
      legal: true,
      jsdoc: false,
      annotation: false,
    },
    dir: rootDir,
    format: 'iife',
    cleanDir: false,
    hashCharacters: classicWorkboxRuntimeCompatible ? 'hex' : undefined,
    chunkFileNames: inline ? swName : workboxAssetName,
    assetFileNames: '[name]-[hash].[ext]',
    entryFileNames: inline ? swName : workboxAssetName,
    codeSplitting: false,
  })
  for (const chunk of output) {
    filePaths.push(path.resolve(rootDir, chunk.fileName))
  }
  const tempSWFile = path.resolve(rootDir, tempSwName)
  if (inline) {
    await Promise.all([
      fs.rm(tempSWFile, { force: true }),
      fixSourceMaps(
        sourcemap,
        swName,
        path.resolve(rootDir, swName),
        classicWorkboxRuntimeCompatible,
        workboxClassicFileForSourceMap,
        workboxClassicFileForSourceMap && sourcemap
          ? {
              tempName: `${workboxChunkName}.js`,
              name: workboxClassicFileForSourceMap!,
              file: path.resolve(rootDir, workboxClassicFileForSourceMap!),
            }
          : undefined,
      ),
    ])
    return
  }

  const workboxClassicFile = output.find(chunk => chunk.name === workboxChunkName)?.fileName

  if (!workboxClassicFile) {
    await Promise.all([
      fs.rm(workboxFile, { force: true }),
      fs.rm(tempSWFile, { force: true }),
    ])
    throw new Error(`${path.relative(
      rootDir,
      workboxFile,
    ).replace(
      '.js',
      '',
    ).replace(
      /\\/g,
      '/',
    )}-<hash>.js asset not found!`)
  }

  await Promise.all([
    fs.rm(workboxFile, { force: true }),
    buildClassicSW(
      rootDir,
      swName,
      tempSwName,
      true,
      sourcemap,
      define,
      filePaths,
      classicWorkboxRuntimeCompatible,
      workboxClassicFile,
    ),
  ])
}

export async function buildModuleSW(
  rootDir: string,
  swName: string,
  tempSwName: string,
  inline: boolean,
  sourcemap: boolean,
  define: import('rolldown').TransformOptions['define'],
  workboxRegex: RegExp[],
  filePaths: string[],
) {
  const instance = await rolldown({
    input: tempSwName,
    treeshake: true,
    platform: 'browser',
    transform: { define },
  })
  const swChunkName = tempSwName.replace('.js', '')
  const { output } = await instance.write({
    sourcemap,
    comments: {
      legal: true,
      jsdoc: false,
      annotation: false,
    },
    dir: rootDir,
    format: 'esm',
    cleanDir: false,
    chunkFileNames: (chunk) => {
      switch (chunk.name) {
        case 'workbox-module':
          return 'workbox-module-[hash].js'
        case swChunkName:
          return swName
        default:
          return '[name]-[hash].[ext]'
      }
    },
    assetFileNames: '[name]-[hash].[ext]',
    entryFileNames: (chunk) => {
      switch (chunk.name) {
        case 'workbox-module':
          return 'workbox-module-[hash].js'
        case swChunkName:
          return swName
        default:
          return '[name]-[hash].js'
      }
    },
    codeSplitting: inline
      ? false
      : {
          groups: [
            {
              minSize: 0,
              name: (moduleId) => {
                return workboxRegex.some(r => r.test(moduleId)) ? 'workbox-module' : undefined
              },
            },
          ],
        },
  })
  for (const chunk of output) {
    filePaths.push(path.resolve(rootDir, chunk.fileName))
  }
  await fs.rm(path.resolve(rootDir, tempSwName), { force: true })
  if (inline) {
    return
  }
  const workboxModuleFile = output.find(chunk => chunk.name === 'workbox-module')?.fileName
  await fixSourceMaps(
    sourcemap,
    swName,
    path.resolve(rootDir, swName),
    false,
    undefined,
    workboxModuleFile && sourcemap
      ? {
          tempName: 'workbox-module.js',
          name: workboxModuleFile,
          file: path.resolve(rootDir, workboxModuleFile),
        }
      : undefined,
  )
}

async function fixSourceMaps(
  sourcemap: boolean,
  swName: string,
  swFile: string,
  classicWorkboxRuntimeCompatible: boolean,
  classicReplacementName?: string,
  workbox?: {
    tempName: string
    name: string
    file: string
  },
) {
  await Promise.all([
    fs.readFile(swFile, 'utf-8').then((code) => {
      const s = new MagicString(code)
      s.replace(
        `//#region ${swName.replace('.js', '.temp.js')}`,
        `//#region ${swName}`,
      )
      if (classicReplacementName) {
        s.replace(
          `importScripts("./workbox${classicWorkboxRuntimeCompatible ? '' : '-classic'}.js")`,
          `importScripts("./${classicReplacementName}")`,
        )
      }
      return fs.writeFile(swFile, s.toString(), 'utf-8')
    }),
    sourcemap
      ? fs.writeFile(
          swFile.replace('.js', '.js.map'),
          await fs.readFile(
            swFile.replace('.js', '.js.map'),
            'utf-8',
          ).then((code) => {
            return code.replace(
              `"${swName.replace('.js', '.temp.js')}"`,
              `"${swName}"`,
            )
          }),
          'utf-8',
        )
      : undefined,
    sourcemap && workbox
      ? fs.writeFile(
          workbox.file.replace('.js', '.js.map'),
          await fs.readFile(
            workbox.file.replace('.js', '.js.map'),
            'utf-8',
          ).then((code) => {
            return code.replace(
              `"${workbox.tempName}"`,
              `"${workbox.name}"`,
            )
          }),
          'utf-8',
        )
      : undefined,
  ].filter(Boolean))
}
