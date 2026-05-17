import { runB } from './b'

export function runC() {
  runB()
  // eslint-disable-next-line no-console
  console.log('runC')
}
