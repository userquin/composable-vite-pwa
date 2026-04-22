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
        code: await import('oxc-transform').then(({ transformAsync }) => transformAsync('', code, {
          sourceType: 'module',
          typescript: {
            rewriteImportExtensions: false,
            onlyRemoveTypeImports: false,
          },
        })).then(result => result.code),
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
