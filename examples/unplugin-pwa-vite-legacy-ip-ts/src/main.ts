// import { registerSW } from 'virtual:pwa-register'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div>
    <h1>Vite + TypeScript</h1>
  </div>
`

// registerSW()

/* import('virtual:pwa-register').then(({
  registerSW,
}) => registerSW()) */

import('virtual:pwa-info').then(({ pwaInfo }) => {
  console.log('PWA info: ', pwaInfo)
})
