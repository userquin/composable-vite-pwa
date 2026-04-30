export async function swViteRollupBuild(): Promise<void> {
  await import('./utils/internal-sw-vite-rollup-build').then(({ internalSwViteRollupBuild }) => internalSwViteRollupBuild())
}
