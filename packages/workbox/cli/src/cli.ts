import cac from 'cac'

import { version } from '../package.json'

const cli = cac('workbox-cli')

cli.command('generate-sw', 'Generate sw')
  .option('--root <dir>', 'Project root directory')
  .option('--config <file>', 'Path to config file')
  .option('--outDir <dir>', 'Output directory')
  .option('--engine <engine>', 'Build engine: vite | rolldown')
  .option('--mode <mode>', 'Build mode')
  .action(async (options) => { console.log(options) })

cli.command('inject-manifest', 'Inject manifest')
  .option('--root <dir>', 'Project root directory')
  .option('--config <file>', 'Path to config file')
  .option('--outDir <dir>', 'Output directory')
  .option('--engine <engine>', 'Build engine: vite | rolldown')
  .option('--mode <mode>', 'Build mode')
  .action(async (options) => { console.log(options) })

cli.command('build-sw', 'Builds a service worker')
  .option('--root <dir>', 'Project root directory')
  .option('--config <file>', 'Path to config file')
  .option('--outDir <dir>', 'Output directory')
  .option('--engine <engine>', 'Build engine: vite | rolldown')
  .option('--mode <mode>', 'Build mode')
  .action(async (options) => { console.log(options) })

cli.help()

cli.version(version, '-v, --version')

cli.parse()
