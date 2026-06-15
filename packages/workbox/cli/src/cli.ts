import process from 'node:process'
import { version } from '../package.json'
import { loadCliConfiguration } from './config'
import { logger } from './logger'

const STRATEGIES = {
  'generate-sw': () => import('./strategies/generate-sw'),
  'inject-manifest': () => import('./strategies/inject-manifest'),
  'build-sw': () => import('./strategies/build-sw'),
  'get-manifest': () => import('./strategies/get-manifest'),
} as const

type StrategyName = keyof typeof STRATEGIES

const STRATEGY_NAMES = Object.keys(STRATEGIES) as StrategyName[]

const USAGE = `Usage: workbox-cli [config] [options]

Arguments:
  config                    Path to the workbox config file. When omitted, the
                            cwd is scanned for workbox.config.{js,mjs,cjs,ts,mts,cts}.

Options:
  -c, --command <strategy>  Run a specific strategy from the config:
                            ${STRATEGY_NAMES.join(' | ')}
  -i, --interactive         Prompt to choose the strategy, overriding the
                            config but not -c (TTY only)
  -h, --help                Show this help
  -v, --version             Show version`

function fail(message: string): never {
  logger.error(message)
  console.log(USAGE)
  process.exit(1)
}

function isStrategyName(value: unknown): value is StrategyName {
  return typeof value === 'string' && value in STRATEGIES
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

let strategy: string | undefined
if (command !== undefined) {
  if (!isStrategyName(command))
    fail(`Unknown strategy '${command}': use ${STRATEGY_NAMES.join(' | ')}`)
  strategy = command
}

try {
  if (!strategy && interactive) {
    if (!process.stdout.isTTY || process.env.CI)
      throw new Error('--interactive requires a TTY (not available in CI)')
    const { isCancel, cancel, select } = await import('@clack/prompts')
    const choice = await select({
      message: 'Which strategy should run?',
      options: STRATEGY_NAMES.map(value => ({ value, label: value })),
    })
    if (isCancel(choice)) {
      cancel('Cancelled')
      process.exit(1)
    }
    strategy = choice
  }

  const config = await loadCliConfiguration(positionals[0])
  strategy ??= config.strategy

  if (!isStrategyName(strategy)) {
    throw new Error(
      strategy === undefined
        ? 'No strategy: set it in the config, pass -c <strategy>, or run with -i'
        : `Unknown strategy '${strategy}': use ${STRATEGY_NAMES.join(' | ')}`,
    )
  }

  const { run } = await STRATEGIES[strategy]()
  await run(config)
  logger.success(`${strategy} complete`)
}
catch (err) {
  logger.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
}
