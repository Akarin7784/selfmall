import { isApiError } from '@selfmall/api'

/** 试算失败文案：按 ApiError.kind 分类，不回显后端原始消息。401 由 onUnauthorized 统一跳登录页。 */
export function quoteErrorText(error: unknown): string {
  if (!isApiError(error)) return '试算失败，请重试'
  switch (error.kind) {
    case 'invalid-argument':
      return '试算参数不合法，请检查数量（1–99 的整数）'
    case 'unauthorized':
    case 'unauthenticated':
      return '登录已失效，请重新登录'
    case 'not-found':
      return '商品不存在或已下架，无法试算'
    case 'rate-limited': {
      const ms = error.retryAfterMs
      if (ms !== undefined && ms > 0) return `请求过于频繁，请 ${Math.ceil(ms / 1000)} 秒后重试`
      return '请求过于频繁，请稍后重试'
    }
    case 'network':
    case 'timeout':
      return '网络异常，请重试'
    case 'service-unavailable':
      return '服务暂时不可用，请稍后重试'
    case 'server-error':
      return '服务器出错了，请稍后重试'
    default:
      return '试算失败，请稍后重试'
  }
}

/** 是否值得提示「可重试」。 */
export function isRetryable(error: unknown): boolean {
  return (
    isApiError(error) &&
    ['network', 'timeout', 'service-unavailable', 'server-error', 'rate-limited'].includes(
      error.kind,
    )
  )
}
