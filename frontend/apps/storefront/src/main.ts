import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import './styles/main.css'
import App from './App.vue'
import { router } from './router'
import { installApiClient } from './api/client'
import { createQueryClient } from './api/query'

async function startMocking(): Promise<void> {
  // 条件直接用 import.meta.env 字面量，构建时开关为 false 会整段摇掉，mock 数据与 msw 不进生产包。
  if (import.meta.env.VITE_ENABLE_MOCK !== 'true') return
  const { enableMocking } = await import('./mocks/enable')
  await enableMocking(true)
}

startMocking().then(() => {
  const app = createApp(App)
  installApiClient(app)
  app
    .use(createPinia())
    .use(router)
    .use(VueQueryPlugin, { queryClient: createQueryClient() })
    .mount('#app')
})
