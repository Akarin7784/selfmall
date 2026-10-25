import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

/** MSW 浏览器 worker。仅在 VITE_ENABLE_MOCK=true 时由 main.ts 动态加载。 */
export const worker = setupWorker(...handlers)
