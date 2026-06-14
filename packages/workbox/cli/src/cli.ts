import process from 'node:process'
import { loadConfiguration } from '@composable-vite-pwa/workbox-build/config'
import { version } from '../package.json'
import { logger } from './logger'

const STRATEGIES = {
  'generate-sw': () => import('./strategies/generate-sw'),
  'inject-manifest': () => import('./strategies/inject-manifest'),
  'build-sw': () => import('./strategies/build-sw'),
  'get-manifest': () => import('./strategies/get-manifest'),
} as const

type StrategyName = keyof typeof STRATEGIES

const USAGE = `Usage: workbox-cli [config] [options]

Options:
  -c, --command <strategy>  Run a specific strategy from the config:
                            ${Object.keys(STRATEGIES).join(' | ')}
  -i, --interactive         Prompt for anything missing (TTY only)
  -h, --help                Show this help
  -v, --version             Show version`

function fail(message: string): never {
  logger.error(message)
  console.log(USAGE)
  process.exit(1)
}

const argv = process.argv.slice(2)
const positionals: string[] = []
let command: string | undefined
let interactive = false

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]
  if (arg === '-c' || arg === '--command') {
    const value = argv[++i]
    if (!value || value.startsWith('-'))
      fail('Missing value for --command')
    command = value
  }
  else if (arg.startsWith('--command=')) {
    command = arg.slice('--command='.length)
  }
  else if (arg === '-i' || arg === '--interactive') {
    interactive = true
  }
  else if (arg === '-h' || arg === '--help') {
    console.log(USAGE)
    process.exit(0)
  }
  else if (arg === '-v' || arg === '--version') {
    console.log(version)
    process.exit(0)
  }
  else if (arg.startsWith('-')) {
    fail(`Unknown option: ${arg}`)
  }
  else {
    positionals.push(arg)
  }
}

if (command && !(command in STRATEGIES))
  fail(`Unknown strategy '${command}': use ${Object.keys(STRATEGIES).join(' | ')}`)

try {
  const config = await loadConfiguration({ path: positionals[0] })
  let strategy = (command ?? config.strategy) as StrategyName | undefined

  if (!strategy && interactive) {
    if (!process.stdout.isTTY || process.env.CI)
      throw new Error('--interactive requires a TTY (not available in CI)')
    const { isCancel, cancel, select } = await import('@clack/prompts')
    const choice = await select({
      message: 'Which strategy should run?',
      options: Object.keys(STRATEGIES).map(value => ({ value, label: value })),
    })
    if (isCancel(choice)) {
      cancel('Cancelled')
      process.exit(1)
    }
    strategy = choice as StrategyName
  }

  if (!strategy)
    throw new Error(`No strategy: set it in the config, pass -c <strategy>, or run with -i`)

  const { run } = await STRATEGIES[strategy]()
  await run(config)
}
catch (err) {
  logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
