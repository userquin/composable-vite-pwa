import { runB } from './b'

export function runA() {
  runB()
  // eslint-disable-next-line no-console
  console.log('runA')
}
