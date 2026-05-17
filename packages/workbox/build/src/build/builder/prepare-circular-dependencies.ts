import type {
  Bundler,
  CircularDependenciesOptions,
  RolldownOptions,
} from './bundler-types'
import pc from 'picocolors'

export function prepareCircularDependencies<T extends Bundler>(
  options: RolldownOptions<T>,
): CircularDependenciesOptions<T> {
  return options.detectCircularDeps
    ? {
        checks: {
          circularDependency: true,
        },
        onLog: (level, log, defaultHandler) => {
          if (log.code === 'CIRCULAR_DEPENDENCY') {
            const message = log.message || 'Circular dependency detected.'
            console.warn([
              `\n${pc.yellow(pc.bold('[Vite PWA]'))} ${pc.yellow('Highly Experimental Warning:')}\n`,
              `  ${pc.yellow(message)}`,
              `  ${pc.yellow(pc.bold('Note:'))} Rolldown might attempt to flatten these modules, but due to the highly experimental nature`,
              `  of custom chunks, ${pc.yellow(pc.bold('YOU MUST REVIEW'))} the final asset outputs manually to verify everything is correct.`,
              `  ${pc.yellow(pc.bold('CRITICAL:'))} Always thoroughly test the generated service worker in a local or staging environment`,
              `  before deploying this build to production!\n`,
            ].join('\n'))
            return // Ignore/swallow the raw native circular dependency warning
          }
          if (level === 'warn') {
            defaultHandler('error', log) // turn other warnings into errors
          }
          else {
            defaultHandler(level, log) // otherwise, just print the log
          }
        },
      } as CircularDependenciesOptions<T>
    : {} as CircularDependenciesOptions<T>
}
