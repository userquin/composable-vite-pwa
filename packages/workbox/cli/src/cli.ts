import type { SWType } from '@composable-vite-pwa/workbox-build/types'
import type { CliStrategy, WorkboxCliConfig } from './options.js'
import process from 'node:process'
import { hasTTY, isCI } from 'std-env'
import pkg from '../package.json' with { type: 'json' }
import { loadCliConfiguration } from './config.js'
import { logger } from './logger.js'
import { runStrategy } from './run-strategy.js'

type StrategyName = 'generate-sw' | 'inject-manifest' | 'build-sw' | 'get-manifest' | 'self-destroy-sw'

const STRATEGY_NAMES: StrategyName[] = [
  'generate-sw',
  'inject-manifest',
  'build-sw',
  'get-manifest',
  'self-destroy-sw',
]

const STRATEGY_OPTION_KEYS: Record<StrategyName, keyof WorkboxCliConfig<CliStrategy, SWType>> = {
  'generate-sw': 'generateSW',
  'build-sw': 'buildSW',
  'inject-manifest': 'injectManifest',
  'get-manifest': 'getManifest',
  'self-destroy-sw': 'selfDestroying',
}

const USAGE = `Usage: workbox-cli [config] [options]

Arguments:
  config                    Path to the workbox config file. When omitted, the
                            cwd is scanned for workbox.config.{js,mjs,cjs,ts,mts,cts}.

Options:
  -c, --command <strategy>  Run a specific strategy from the config:
                            ${STRATEGY_NAMES.join(' | ')}
  -s, --self-destroy        Also emit a self-destroying SW after the main
                            strategy (or run the self-destroy-sw strategy)
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
  return typeof value === 'string' && STRATEGY_NAMES.includes(value as StrategyName)
}

async function init() {
  const argv = process.argv.slice(2)
  const positionals: string[] = []
  let command: string | undefined
  let selfDestroying = false
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
    else if (arg === '-s' || arg === '--self-destroy') {
      selfDestroying = true
    }
    else if (arg === '-i' || arg === '--interactive') {
      interactive = true
    }
    else if (arg === '-h' || arg === '--help') {
      console.log(USAGE)
      process.exit(0)
    }
    else if (arg === '-v' || arg === '--version') {
      console.log(pkg.version)
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
    const config = await loadCliConfiguration(positionals[0], selfDestroying)

    if (!strategy && interactive) {
      if (!hasTTY || isCI)
        throw new Error('--interactive requires a TTY (not available in CI)')
      const { isCancel, cancel, select } = await import('@clack/prompts')
      const choice = await select({
        message: 'Which strategy should run?',
        options: STRATEGY_NAMES.map(s => ({
          value: s,
          label: s,
          hint: config[STRATEGY_OPTION_KEYS[s]] == null ? 'not configured' : undefined,
        })),
      })
      if (isCancel(choice)) {
        cancel('Cancelled')
        process.exit(1)
      }
      strategy = choice
    }

    strategy ??= config.strategy

    if (!isStrategyName(strategy)) {
      throw new Error(
        strategy === undefined
          ? 'No strategy: set it in the config, pass -c <strategy>, or run with -i'
          : `Unknown strategy '${strategy}': use ${STRATEGY_NAMES.join(' | ')}`,
      )
    }

    const SW_BUILDERS: readonly StrategyName[] = ['generate-sw', 'build-sw', 'inject-manifest']
    const shouldSelfDestroy = SW_BUILDERS.includes(strategy)
      && !!config.selfDestroying?.selfDestroying

    await runStrategy(strategy, config)
    logger.success(`${strategy} complete`)

    if (shouldSelfDestroy) {
      await runStrategy('self-destroy-sw', config)
      logger.success('self-destroying SW complete')
    }
  }
  catch (err) {
    logger.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

init().catch((e) => {
  console.error(e)
})
