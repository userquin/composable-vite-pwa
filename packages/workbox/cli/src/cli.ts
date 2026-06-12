import process from 'node:process'
import { loadConfiguration } from '@composable-vite-pwa/workbox-build/config'
import { version } from '../package.json'
import { logger } from './logger'

const STRATEGIES = {
  'generate-sw': () => import('./strategies/generate-sw'),
  'inject-manifest': () => import('./strategies/inject-manifest'),
  'build-sw': () => import('./strategies/build-sw'),
} as const

const argv = process.argv.slice(2)
if (argv.includes('-v') || argv.includes('--version')) {
  console.log(version)
  process.exit(0)
}
if (argv.includes('-h') || argv.includes('--help')) {
  // TODO - Add ability to default to workbox.config.{js,mjs,ts,cjs,mts,cts} when user passes no path
  console.log('Usage: workbox-cli <config>  (defaults to workbox.config.{js,mjs,ts,cjs,mts,cts} in the current directory)')
  process.exit(0)
}
const unknown = argv.find(a => a.startsWith('-'))
if (unknown) {
  logger.error(`Unknown option: ${unknown}`)
  process.exit(1)
}

try {
  const config = await loadConfiguration({ path: argv[0] })
  const load = (config.strategy && STRATEGIES[config.strategy])
  if (!load)
    throw new Error(`Config must declare a strategy: ${Object.keys(STRATEGIES).join(' | ')}`)
  const { run } = await load()
  await run(config)
}
catch (err) {
  logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
