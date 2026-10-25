import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start()
}

enableMocking().then(() => {
  createApp(App).use(createPinia()).use(router).use(VueQueryPlugin).mount('#app')
})
