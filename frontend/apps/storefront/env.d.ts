/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 开发代理目标，默认 http://localhost:8080 */
  readonly VITE_API_PROXY_TARGET?: string
  /** 'true' 时启用 MSW mock，默认关闭 */
  readonly VITE_ENABLE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
