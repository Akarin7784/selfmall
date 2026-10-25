import {
  ApiError,
  DEFAULT_MAX_RETRY_AFTER_MS,
  DEFAULT_MESSAGES,
  kindFromStatus,
  parseRetryAfter,
  type ApiErrorKind,
} from './errors'
import { DEFAULT_MONEY_FIELDS, parseJsonPreservingMoney } from './json'
import { isMoneyString } from './money'
import { createTokenStore, type TokenStore } from './token'
import type {
  ListProductsParams,
  LoginRequest,
  MemberProfile,
  OrderQuote,
  Product,
  QuoteRequest,
  TokenResponse,
} from './types'

/** 所有接口的统一前缀，开发期由 Vite 代理转发到网关。 */
export const API_BASE_PATH = '/api'
export const DEFAULT_TIMEOUT_MS = 15_000

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface ApiClientOptions {
  /** 默认 `/api`。 */
  baseUrl?: string
  /** 默认 globalThis.fetch；测试注入假实现。 */
  fetch?: FetchLike
  /** 默认 createTokenStore()（localStorage，失败退回内存）。 */
  tokenStore?: TokenStore
  /**
   * 需要令牌的接口返回 401，或本地没有令牌时调用（令牌已先被清除）。
   * 由应用接线，通常是跳转登录页。
   */
  onUnauthorized?: (error: ApiError) => void
  /** 单次请求超时，默认 15000ms。 */
  timeoutMs?: number
  /** 按金额处理（保留原文字符串）的字段名，默认 price、unitPrice、totalAmount。 */
  moneyFields?: readonly string[]
  /** Retry-After 上限，默认 5 分钟。 */
  maxRetryAfterMs?: number
}

export interface ApiClient {
  readonly tokenStore: TokenStore
  /** 演示登录；成功后把 accessToken 写入 tokenStore。 */
  login(req: LoginRequest): Promise<TokenResponse>
  /** 清除本地令牌（后端暂无撤销接口）。 */
  logout(): void
  listProducts(params?: ListProductsParams): Promise<Product[]>
  getProduct(id: number): Promise<Product>
  quoteOrder(req: QuoteRequest): Promise<OrderQuote>
  getCurrentMember(): Promise<MemberProfile>
}

interface RequestSpec {
  method: 'GET' | 'POST'
  path: string
  body?: unknown
  auth: boolean
}

function clientError(kind: ApiErrorKind, message: string): ApiError {
  return new ApiError({
    kind,
    httpStatus: null,
    code: `CLIENT_${kind.toUpperCase().replace(/-/g, '_')}`,
    message,
  })
}

function invalidArg(message: string): ApiError {
  return clientError('invalid-argument', message)
}

function requireInt(name: string, value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) {
    throw invalidArg(`${name} 必须是 ${min}–${max} 的整数`)
  }
  return value
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function isEnvelope(v: unknown): v is { code: string; message: string; data: unknown } {
  return isRecord(v) && typeof v.code === 'string' && typeof v.message === 'string' && 'data' in v
}

function isProduct(v: unknown): v is Product {
  return (
    isRecord(v) &&
    typeof v.id === 'number' &&
    typeof v.skuCode === 'string' &&
    typeof v.name === 'string' &&
    isMoneyString(v.price)
  )
}

function redact(text: string, token: string | null): string {
  return token ? text.split(token).join('[REDACTED]') : text
}

export function createApiClient(options: ApiClientOptions = {}): ApiClient {
  const baseUrl = (options.baseUrl ?? API_BASE_PATH).replace(/\/+$/, '')
  const fetchImpl: FetchLike | undefined =
    options.fetch ??
    (typeof globalThis.fetch === 'function' ? globalThis.fetch.bind(globalThis) : undefined)
  const tokenStore = options.tokenStore ?? createTokenStore()
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const moneyFields = options.moneyFields ?? DEFAULT_MONEY_FIELDS
  const maxRetryAfterMs = options.maxRetryAfterMs ?? DEFAULT_MAX_RETRY_AFTER_MS

  function unauthorized(error: ApiError): ApiError {
    tokenStore.clear()
    options.onUnauthorized?.(error)
    return error
  }

  async function request(spec: RequestSpec): Promise<unknown> {
    if (!fetchImpl) throw clientError('network', '当前环境没有可用的 fetch')
    const headers: Record<string, string> = { Accept: 'application/json' }
    let token: string | null = null
    if (spec.auth) {
      token = tokenStore.get()
      if (!token) {
        // 约定：需要令牌而本地没有时，不发请求，直接抛 unauthenticated 并通知上层
        throw unauthorized(clientError('unauthenticated', DEFAULT_MESSAGES.unauthenticated))
      }
      headers.Authorization = `Bearer ${token}`
    }
    if (spec.body !== undefined) headers['Content-Type'] = 'application/json'

    const controller = new AbortController()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, timeoutMs)

    let response: Response
    let text: string
    try {
      response = await fetchImpl(baseUrl + spec.path, {
        method: spec.method,
        headers,
        body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
        signal: controller.signal,
      })
      text = await response.text()
    } catch {
      // 不把底层异常对象挂到 ApiError 上，避免带出请求头等敏感信息
      throw timedOut
        ? clientError('timeout', DEFAULT_MESSAGES.timeout)
        : clientError('network', DEFAULT_MESSAGES.network)
    } finally {
      clearTimeout(timer)
    }

    let parsed: unknown = undefined
    if (text.trim() !== '') {
      try {
        parsed = parseJsonPreservingMoney(text, moneyFields)
      } catch {
        parsed = undefined // HTML、纯文本等：按非统一格式处理
      }
    }
    const envelope = isEnvelope(parsed) ? parsed : null

    if (response.ok) {
      if (!envelope) {
        throw new ApiError({
          kind: 'invalid-response',
          httpStatus: response.status,
          code: `HTTP_${response.status}`,
          message: DEFAULT_MESSAGES['invalid-response'],
        })
      }
      if (envelope.code === 'OK') return envelope.data
      // 2xx 但业务码不是 OK：按业务码大致归类
      const kind: ApiErrorKind =
        envelope.code === 'INVALID_ARGUMENT' ? 'invalid-argument' : 'server-error'
      throw new ApiError({
        kind,
        httpStatus: response.status,
        code: envelope.code,
        message: redact(envelope.message, token) || DEFAULT_MESSAGES[kind],
      })
    }

    const status = response.status
    const kind = kindFromStatus(status)
    const init = {
      kind,
      httpStatus: status,
      code: envelope ? envelope.code : `HTTP_${status}`,
      message: (envelope && redact(envelope.message, token)) || DEFAULT_MESSAGES[kind],
    }
    let retryAfterMs: number | undefined
    if (kind === 'rate-limited' || kind === 'service-unavailable') {
      retryAfterMs = parseRetryAfter(
        response.headers.get('Retry-After'),
        Date.now(),
        maxRetryAfterMs,
      )
    }
    const error = new ApiError(retryAfterMs === undefined ? init : { ...init, retryAfterMs })
    // 公开接口（含登录密码错误）的 401 不清令牌、不跳登录
    if (kind === 'unauthorized' && spec.auth) throw unauthorized(error)
    throw error
  }

  function badShape(): ApiError {
    return new ApiError({
      kind: 'invalid-response',
      httpStatus: 200,
      code: 'HTTP_200',
      message: DEFAULT_MESSAGES['invalid-response'],
    })
  }

  return {
    tokenStore,

    async login(req) {
      if (!isRecord(req) || typeof req.username !== 'string' || req.username.trim() === '') {
        throw invalidArg('username 不能为空')
      }
      if (typeof req.password !== 'string' || req.password === '') {
        throw invalidArg('password 不能为空')
      }
      const data = await request({
        method: 'POST',
        path: '/auth/token',
        body: { username: req.username, password: req.password },
        auth: false,
      })
      if (!isRecord(data) || typeof data.accessToken !== 'string' || data.accessToken === '') {
        throw badShape()
      }
      if (data.tokenType !== 'Bearer' || typeof data.expiresIn !== 'number') throw badShape()
      tokenStore.set(data.accessToken)
      return { accessToken: data.accessToken, tokenType: 'Bearer', expiresIn: data.expiresIn }
    },

    logout() {
      tokenStore.clear()
    },

    async listProducts(params = {}) {
      const page = requireInt('page', params.page ?? 0, 0, 10000)
      const size = requireInt('size', params.size ?? 20, 1, 100)
      const data = await request({
        method: 'GET',
        path: `/products?page=${page}&size=${size}`,
        auth: false,
      })
      if (!Array.isArray(data) || !data.every(isProduct)) throw badShape()
      return data
    },

    async getProduct(id) {
      requireInt('id', id, 1, Number.MAX_SAFE_INTEGER)
      const data = await request({ method: 'GET', path: `/products/${id}`, auth: false })
      if (!isProduct(data)) throw badShape()
      return data
    },

    async quoteOrder(req) {
      if (!isRecord(req)) throw invalidArg('请求不能为空')
      const productId = requireInt('productId', req.productId, 1, Number.MAX_SAFE_INTEGER)
      const quantity = requireInt('quantity', req.quantity, 1, 99)
      const data = await request({
        method: 'POST',
        path: '/orders/quote',
        body: { productId, quantity },
        auth: true,
      })
      if (
        !isRecord(data) ||
        typeof data.memberId !== 'string' ||
        typeof data.productId !== 'number' ||
        typeof data.quantity !== 'number' ||
        !isMoneyString(data.unitPrice) ||
        !isMoneyString(data.totalAmount)
      ) {
        throw badShape()
      }
      return data as unknown as OrderQuote
    },

    async getCurrentMember() {
      const data = await request({ method: 'GET', path: '/members/me', auth: true })
      if (!isRecord(data) || typeof data.memberId !== 'string') throw badShape()
      return { memberId: data.memberId }
    },
  }
}
