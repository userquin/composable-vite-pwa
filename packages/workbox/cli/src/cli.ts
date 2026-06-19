import type { CliStrategy, WorkboxCliConfig } from './options'
import process from 'node:process'
import { hasTTY, isCI } from 'std-env'
import pkg from '../package.json' with { type: 'json' }
import { loadCliConfiguration } from './config'
import { logger } from './logger'
import { assertSelfDestroyingSW } from './options'
import { runBuildSW } from './strategies/build-sw'
import { runGenerateSW } from './strategies/generate-sw'
import { runGetManifest } from './strategies/get-manifest'
import { runInjectManifest } from './strategies/inject-manifest'
import { runSelfDestroyingSW } from './strategies/self-destroy-sw'

const STRATEGIES = {
  'generate-sw': runGenerateSW,
  'inject-manifest': runInjectManifest,
  'build-sw': runBuildSW,
  'get-manifest': runGetManifest,
  'self-destroy-sw': runSelfDestroyingSW,
} as const satisfies Record<CliStrategy, (config: WorkboxCliConfig) => Promise<void>>

type StrategyName = keyof typeof STRATEGIES

const STRATEGY_NAMES = Object.keys(STRATEGIES) as StrategyName[]

const STRATEGY_OPTION_KEYS: Record<StrategyName, keyof WorkboxCliConfig> = {
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
  return typeof value === 'string' && value in STRATEGIES
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
    const SW_BUILDERS = ['generate-sw', 'build-sw', 'inject-manifest'] as const
    const emitSelfDestroying = SW_BUILDERS.includes(strategy as any)
      && !!config.selfDestroying?.selfDestroying

    if (emitSelfDestroying)
      assertSelfDestroyingSW(config.selfDestroying)

    await STRATEGIES[strategy](config)
    logger.success(`${strategy} complete`)

    if (emitSelfDestroying) {
      await runSelfDestroyingSW(config)
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
