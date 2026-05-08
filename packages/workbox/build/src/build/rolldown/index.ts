import { detectGenerateSWDependencies } from '../bundler/detector'
import { checkGenerateSWDependencies } from '../bundler/log'

/**
 * Displays a warning if some required peer is missing with Vite dev server.
 * @return true if the consumer has been warned otherwise false
 */
export async function checkRolldownDevGenerateModernSWDependencies(): Promise<boolean> {
  const detection = await detectGenerateSWDependencies()
  const message = checkGenerateSWDependencies(detection, true)
  if (message) {
    console.warn(message)
  }
  return !!message
}
