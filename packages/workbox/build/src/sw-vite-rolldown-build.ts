export async function swViteRolldownBuild(): Promise<void> {
  await import('./utils/internal-sw-vite-rolldown-build').then(({ internalSwViteRolldownBuild }) => internalSwViteRolldownBuild())
}
