import { QueryClient } from '@tanstack/vue-query'
import { isApiError } from '@selfmall/api'

/** 网络、超时、5xx（含 503）最多重试 1 次；4xx、参数错误、响应格式错误不重试。 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false
  if (!isApiError(error)) return false
  return ['network', 'timeout', 'server-error', 'service-unavailable'].includes(error.kind)
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  })
}
