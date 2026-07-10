module.exports = async () => {
  const path = require('node:path')
  const { WebpackPWA } = await import('@composable-vite-pwa/unplugin-pwa/webpack')
  return {
    mode: 'production',
    context: __dirname,
    entry: './src/index.js',
    output: { clean: true, filename: 'app.js', path: path.resolve(__dirname, 'dist') },
    plugins: [WebpackPWA({ strategies: 'generateSW' })],
  }
}
