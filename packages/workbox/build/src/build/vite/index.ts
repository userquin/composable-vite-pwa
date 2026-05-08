import { loadDetector } from '../bundler/utils'

/**
 * Displays a warning if some required peer is missing with Vite dev server.
 * @return true if the consumer has been warned otherwise false
 */
export async function checkViteDevGenerateModernSWDependencies(): Promise<boolean> {
  return await loadDetector({
    mode: 'generate-sw',
    bundler: 'vite',
    throwError: false,
  }).then(({ warned }) => warned)
}
