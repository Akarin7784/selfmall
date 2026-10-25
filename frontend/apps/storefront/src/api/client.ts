import { inject, type App, type InjectionKey } from 'vue'
import { API_BASE_PATH, createApiClient, type ApiClient } from '@selfmall/api'

/**
 * 买家端接口客户端单例。baseUrl 固定为 `/api`（开发期由 Vite 代理转发到网关）。
 * onUnauthorized：FE-04 只有公开的商品接口，暂不处理；FE-05 接登录页时在这里接线跳转。
 */
export const api: ApiClient = createApiClient({
  baseUrl: API_BASE_PATH,
  onUnauthorized: () => {
    // TODO(FE-05)：跳转登录页并带上 redirect。
  },
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
