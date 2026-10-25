import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { installApiClient } from './api/client'
import { createQueryClient } from './api/query'

async function enableMocking(): Promise<void> {
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') return
  const { worker } = await import('./mocks/browser')
  await worker.start()
}

enableMocking().then(() => {
  const app = createApp(App)
  installApiClient(app)
  app
    .use(createPinia())
    .use(router)
    .use(VueQueryPlugin, { queryClient: createQueryClient() })
    .mount('#app')
})
