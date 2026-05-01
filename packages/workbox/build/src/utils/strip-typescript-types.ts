export async function stripTypescriptTypes(code: string) {
  try {
    return {
      transformed: true,
      code: await import('node:module').then(({ stripTypeScriptTypes }) => stripTypeScriptTypes(code)),
    }
  }
  catch {
    try {
      return {
        transformed: true,
        code: await import('oxc-transform').then((m) => {
          // latest oxc-transform renamed transformAsync to transform (sync) and transform to transformSync
          if ('transformAsync' in m) {
            const transform: (filename: string, code: string, options?: {
              sourceType: 'module'
              typescript: {
                rewriteImportExtensions: boolean
                onlyRemoveTypeImports: boolean
              }
            }) => { code: string } = (m as any).transformSync

            return transform('', code, {
              sourceType: 'module',
              typescript: {
                rewriteImportExtensions: false,
                onlyRemoveTypeImports: false,
              },
            }).code
          }

          return m.transformSync('', code, {
            sourceType: 'module',
            typescript: {
              rewriteImportExtensions: false,
              onlyRemoveTypeImports: false,
            },
          }).code
        }),
      }
    }
    catch {
      // just ignore
    }
  }

  return {
    transformed: false,
    code,
  }
}
