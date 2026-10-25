/**
 * 统一错误类型。所有请求失败（参数校验、网络、超时、HTTP 错误、响应格式异常）都转成 ApiError，
 * 调用方只需按 kind 分支处理。错误消息里不会出现令牌。
 */
export type ApiErrorKind =
  | 'invalid-argument' // 400，或客户端参数校验失败（不发请求）
  | 'unauthenticated' // 需要令牌但本地没有令牌（不发请求）
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'not-found' // 404
  | 'rate-limited' // 429
  | 'service-unavailable' // 503
  | 'server-error' // 其他 5xx，或 2xx 响应里 code 为 INTERNAL_ERROR 等业务错误
  | 'http-error' // 其他 4xx 等未单独分类的状态
  | 'network' // fetch 抛错（断网、DNS、CORS 等）
  | 'timeout' // 超过 timeoutMs
  | 'invalid-response' // 2xx 但响应不是统一格式或字段不符合约定

export interface ApiErrorInit {
  kind: ApiErrorKind
  httpStatus: number | null
  code: string
  message: string
  retryAfterMs?: number
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** HTTP 状态码；客户端校验、网络错误、超时时为 null。 */
  readonly httpStatus: number | null
  /** 后端错误码（如 INVALID_ARGUMENT）；非统一格式时为 HTTP_<状态码>，客户端错误为 CLIENT_<KIND>。 */
  readonly code: string
  /** 429/503 时从 Retry-After 解析出的毫秒数（已做上限保护）。 */
  readonly retryAfterMs?: number

  constructor(init: ApiErrorInit) {
    super(init.message)
    this.name = 'ApiError'
    this.kind = init.kind
    this.httpStatus = init.httpStatus
    this.code = init.code
    if (init.retryAfterMs !== undefined) this.retryAfterMs = init.retryAfterMs
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError
}

/** 按 HTTP 状态码分类。 */
export function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'invalid-argument'
    case 401:
      return 'unauthorized'
    case 403:
      return 'forbidden'
    case 404:
      return 'not-found'
    case 429:
      return 'rate-limited'
    case 503:
      return 'service-unavailable'
    default:
      return status >= 500 ? 'server-error' : 'http-error'
  }
}

/** 非统一格式响应（HTML、空 body、框架错误）时使用的默认消息，不回显原始 body。 */
export const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  'invalid-argument': '请求参数不合法',
  unauthenticated: '尚未登录',
  unauthorized: '登录已失效，请重新登录',
  forbidden: '没有权限执行此操作',
  'not-found': '请求的资源不存在',
  'rate-limited': '请求过于频繁，请稍后再试',
  'service-unavailable': '服务暂时不可用，请稍后再试',
  'server-error': '服务器错误，请稍后再试',
  'http-error': '请求失败',
  network: '网络连接失败，请检查网络',
  timeout: '请求超时，请稍后再试',
  'invalid-response': '服务器响应格式异常',
}

/** Retry-After 的默认上限：5 分钟。 */
export const DEFAULT_MAX_RETRY_AFTER_MS = 5 * 60 * 1000

/**
 * 解析 Retry-After（RFC 9110）：支持非负整数秒和 HTTP 日期（IMF-fixdate）两种格式。
 * 结果换算为毫秒，并夹在 [0, maxMs] 内；无法解析时返回 undefined。
 */
export function parseRetryAfter(
  value: string | null | undefined,
  now: number = Date.now(),
  maxMs: number = DEFAULT_MAX_RETRY_AFTER_MS,
): number | undefined {
  if (value == null) return undefined
  const v = value.trim()
  if (v === '') return undefined
  let ms: number
  if (/^\d+$/.test(v)) {
    ms = Number(v) * 1000
  } else {
    // 只接受 RFC 9110 规定发送方必须使用的 IMF-fixdate，避免 Date.parse 宽松解析任意字符串
    if (!/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(v)) return undefined
    const t = Date.parse(v)
    if (Number.isNaN(t)) return undefined
    ms = t - now
  }
  if (!Number.isFinite(ms)) return maxMs
  return Math.min(Math.max(ms, 0), maxMs)
}
