import { flushPromises, mount } from '@vue/test-utils'
import { createMemoryHistory } from 'vue-router'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { vi } from 'vitest'
import { ApiError, type ApiClient, type ApiErrorKind, type Product } from '@selfmall/api'
import App from '@/App.vue'
import { createAppRouter } from '@/router'
import { API_CLIENT_KEY } from '@/api/client'
import { createQueryClient } from '@/api/query'

export type FakeApi = ApiClient & {
  listProducts: ReturnType<typeof vi.fn>
  getProduct: ReturnType<typeof vi.fn>
}

/** 假客户端：所有方法默认抛错，测试按需覆盖，绝不访问网络。 */
export function createFakeApi(): FakeApi {
  const fail = () => Promise.reject(new Error('未在测试里配置'))
  return {
    tokenStore: { get: () => null, set: () => {}, clear: () => {} },
    login: vi.fn(fail),
    logout: vi.fn(),
    listProducts: vi.fn(fail),
    getProduct: vi.fn(fail),
    quoteOrder: vi.fn(fail),
    getCurrentMember: vi.fn(fail),
  } as unknown as FakeApi
}

export function apiError(
  kind: ApiErrorKind,
  extra: Partial<{ retryAfterMs: number; httpStatus: number }> = {},
): ApiError {
  return new ApiError({
    kind,
    httpStatus: extra.httpStatus ?? null,
    code: `TEST_${kind}`,
    message: kind,
    ...(extra.retryAfterMs !== undefined ? { retryAfterMs: extra.retryAfterMs } : {}),
  })
}

export function makeProducts(count: number, start = 1): Product[] {
  return Array.from({ length: count }, (_, i) => ({
    id: start + i,
    skuCode: `SKU-${start + i}`,
    name: `商品 ${start + i}`,
    price: '99.00',
  }))
}

export async function mountAt(path: string, api: FakeApi) {
  const router = createAppRouter(createMemoryHistory())
  const queryClient = createQueryClient()
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0, gcTime: Infinity },
  })
  await router.push(path)
  await router.isReady()
  const wrapper = mount(App, {
    attachTo: document.body,
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      provide: { [API_CLIENT_KEY as symbol]: api },
    },
  })
  await flushPromises()
  return { wrapper, router, queryClient }
}

/** 等待异步组件、查询与重试完成。 */
export async function settle(times = 5): Promise<void> {
  for (let i = 0; i < times; i++) {
    await flushPromises()
    await new Promise((r) => setTimeout(r, 0))
  }
}
