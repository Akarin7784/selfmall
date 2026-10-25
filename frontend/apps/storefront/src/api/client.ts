import { inject, type App, type InjectionKey } from 'vue'
import { API_BASE_PATH, createApiClient, type ApiClient } from '@selfmall/api'
import { notifyUnauthorized } from '@/session/unauthorized'

/**
 * 买家端接口客户端单例。baseUrl 固定为 `/api`（开发期由 Vite 代理转发到网关）。
 * onUnauthorized（FE-05）：受保护接口 401 或本地无令牌时，客户端已先清令牌；
 * 这里通知应用层同步会话并跳转 `/login?redirect=当前路径`（见 App.vue）。
 */
export const api: ApiClient = createApiClient({
  baseUrl: API_BASE_PATH,
  onUnauthorized: () => notifyUnauthorized(),
})

export const API_CLIENT_KEY: InjectionKey<ApiClient> = Symbol('selfmall.apiClient')

/** 在应用上提供客户端；测试时传入假客户端。 */
export function installApiClient(app: App, client: ApiClient = api): void {
  app.provide(API_CLIENT_KEY, client)
}

/** 组件内获取客户端；未提供时退回单例。 */
export function useApiClient(): ApiClient {
  return inject(API_CLIENT_KEY, api)
}
