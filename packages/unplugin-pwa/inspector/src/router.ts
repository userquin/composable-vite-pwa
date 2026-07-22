import { createRouter, createWebHashHistory } from 'vue-router'
import { handleHotUpdate, routes } from 'vue-router/auto-routes'
import { error, loadingSW, ready } from './state'

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

router.onError((err) => {
  loadingSW.value = false
  error.value = err
})

router.beforeEach(async (to) => {
  if (to?.name === '/sw') {
    loadingSW.value = true
    await new Promise(resolve => setTimeout(resolve, 256))
  }
  else if (to?.name === '/') {
    loadingSW.value = false
    if (ready.value) {
      error.value = undefined
    }
  }
})

router.afterEach((to) => {
  if (to?.name === '/sw') {
    loadingSW.value = false
  }
  else if (to?.name === '/') {
    if (ready.value) {
      error.value = undefined
    }
  }
})

if (import.meta.hot) {
  handleHotUpdate(router)
}
