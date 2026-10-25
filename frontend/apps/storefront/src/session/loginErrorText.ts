import { isApiError } from '@selfmall/api'

/** 登录失败文案：按 ApiError.kind 分类，不回显后端原始消息，也不包含任何用户输入。 */
export function loginErrorText(error: unknown): string {
  if (!isApiError(error)) return '登录失败，请重试'
  switch (error.kind) {
    case 'unauthorized':
      return '用户名或密码错误'
    case 'invalid-argument':
      return '请填写用户名和密码'
    case 'rate-limited': {
      const ms = error.retryAfterMs
      if (ms !== undefined && ms > 0) return `尝试过于频繁，请 ${Math.ceil(ms / 1000)} 秒后重试`
      return '尝试过于频繁，请稍后重试'
    }
    case 'network':
    case 'timeout':
      return '网络异常，请检查网络后重试'
    case 'service-unavailable':
    case 'server-error':
      return '登录服务暂时不可用，请稍后重试'
    default:
      return '登录失败，请稍后重试'
  }
}
