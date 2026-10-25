import { isApiError } from '@selfmall/api'

/** 按 ApiError.kind 给出面向买家的错误文案（不回显后端原始信息）。 */
export function errorText(error: unknown): string {
  if (!isApiError(error)) return '加载失败，请重试'
  switch (error.kind) {
    case 'network':
    case 'timeout':
      return '网络异常，请重试'
    case 'rate-limited': {
      const ms = error.retryAfterMs
      if (ms !== undefined && ms > 0) return `请求过于频繁，请 ${Math.ceil(ms / 1000)} 秒后重试`
      return '请求过于频繁，请稍后重试'
    }
    case 'service-unavailable':
      return '服务暂时不可用，请稍后重试'
    case 'server-error':
      return '服务器出错了，请稍后重试'
    default:
      return '加载失败，请重试'
  }
}
