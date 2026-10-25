import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApiClient, type FetchLike } from './client'
import { ApiError } from './errors'
import { createMemoryTokenStore } from './token'

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.secret-token-value.sig'

interface Call {
  url: string
  init: RequestInit | undefined
}

function fakeFetch(
  respond: (call: Call) => Response | Promise<Response>,
): FetchLike & { calls: Call[] } {
  const calls: Call[] = []
  const fn = (async (url: string, init?: RequestInit) => {
    const call = { url, init }
    calls.push(call)
    return respond(call)
  }) as FetchLike & { calls: Call[] }
  fn.calls = calls
  return fn
}

function json(status: number, body: string, headers: Record<string, string> = {}): Response {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })
}

const ok = (data: string) => json(200, `{"code":"OK","message":"success","data":${data}}`)

function setup(
  respond: (call: Call) => Response | Promise<Response>,
  token: string | null = TOKEN,
) {
  const fetch = fakeFetch(respond)
  const tokenStore = createMemoryTokenStore()
  if (token) tokenStore.set(token)
  const onUnauthorized = vi.fn()
  const client = createApiClient({ fetch, tokenStore, onUnauthorized, timeoutMs: 50 })
  return { client, fetch, tokenStore, onUnauthorized }
}

async function catchErr(p: Promise<unknown>): Promise<ApiError> {
  try {
    await p
  } catch (e) {
    expect(e).toBeInstanceOf(ApiError)
    return e as ApiError
  }
  throw new Error('应当抛出 ApiError')
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('验收 1：解包统一响应与非统一错误', () => {
  it('解包 {code,message,data} 返回 data', async () => {
    const { client, fetch } = setup(() =>
      ok('{"id":1,"skuCode":"SELF-001","name":"示例","price":99.00}'),
    )
    await expect(client.getProduct(1)).resolves.toEqual({
      id: 1,
      skuCode: 'SELF-001',
      name: '示例',
      price: '99.00',
    })
    expect(fetch.calls[0]?.url).toBe('/api/products/1')
  })

  it('业务错误统一格式：保留后端 code/message', async () => {
    const { client } = setup(() =>
      json(400, '{"code":"INVALID_ARGUMENT","message":"请求参数不合法","data":null}'),
    )
    const err = await catchErr(client.getProduct(1))
    expect(err).toMatchObject({
      kind: 'invalid-argument',
      httpStatus: 400,
      code: 'INVALID_ARGUMENT',
      message: '请求参数不合法',
    })
  })

  it.each([
    [
      'Spring Security 框架 JSON',
      401,
      '{"timestamp":"2026-10-25T00:00:00Z","status":401,"error":"Unauthorized","path":"/api/x"}',
    ],
    ['HTML 错误页', 502, '<html><body><h1>502 Bad Gateway</h1></body></html>'],
    ['空 body', 503, ''],
    ['纯文本', 404, 'Not Found'],
    ['截断的 JSON', 500, '{"code":"INTERNAL_'],
  ])('%s → ApiError，code=HTTP_<状态>，消息不回显 body', async (_n, status, body) => {
    const { client } = setup(
      () => new Response(body, { status, headers: { 'Content-Type': 'text/html' } }),
    )
    const err = await catchErr(client.getProduct(1))
    expect(err.httpStatus).toBe(status)
    expect(err.code).toBe(`HTTP_${status}`)
    expect(err.message).not.toContain('<html>')
    expect(err.message.length).toBeGreaterThan(0)
  })

  it('2xx 但不是统一格式 → invalid-response', async () => {
    const { client } = setup(() => new Response('<html></html>', { status: 200 }))
    expect(await catchErr(client.getProduct(1))).toMatchObject({
      kind: 'invalid-response',
      code: 'HTTP_200',
    })
    const { client: c2 } = setup(() => new Response('', { status: 200 }))
    expect((await catchErr(c2.getProduct(1))).kind).toBe('invalid-response')
  })

  it('2xx 统一格式但 data 字段不符合约定 → invalid-response', async () => {
    const { client } = setup(() => ok('{"id":"1","name":"x"}'))
    expect((await catchErr(client.getProduct(1))).kind).toBe('invalid-response')
  })

  it('2xx 但 code 不是 OK → 按业务码分类', async () => {
    const { client } = setup(() =>
      json(200, '{"code":"INTERNAL_ERROR","message":"内部错误","data":null}'),
    )
    expect(await catchErr(client.getProduct(1))).toMatchObject({
      kind: 'server-error',
      code: 'INTERNAL_ERROR',
      httpStatus: 200,
    })
  })
})

describe('验收 2：401 清令牌并通知上层', () => {
  it('需要令牌的接口返回 401：清令牌、调用 onUnauthorized', async () => {
    const { client, tokenStore, onUnauthorized } = setup(() =>
      json(401, '{"code":"HTTP_401","message":"未登录","data":null}'),
    )
    const err = await catchErr(client.getCurrentMember())
    expect(err).toMatchObject({ kind: 'unauthorized', httpStatus: 401 })
    expect(tokenStore.get()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
    expect(onUnauthorized).toHaveBeenCalledWith(err)
  })

  it('401 是框架格式（空 body）时同样处理', async () => {
    const { client, tokenStore, onUnauthorized } = setup(() => new Response(null, { status: 401 }))
    expect((await catchErr(client.quoteOrder({ productId: 1, quantity: 1 }))).kind).toBe(
      'unauthorized',
    )
    expect(tokenStore.get()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('本地没有令牌：不发请求，抛 unauthenticated 并调用 onUnauthorized', async () => {
    const { client, fetch, onUnauthorized } = setup(() => ok('{"memberId":"1"}'), null)
    const err = await catchErr(client.getCurrentMember())
    expect(err).toMatchObject({ kind: 'unauthenticated', httpStatus: null })
    expect(fetch.calls).toHaveLength(0)
    expect(onUnauthorized).toHaveBeenCalledWith(err)
  })

  it('登录密码错误（公开接口 401）：不清已有令牌、不触发跳转', async () => {
    const { client, tokenStore, onUnauthorized } = setup(() =>
      json(401, '{"code":"HTTP_401","message":"用户名或密码错误","data":null}'),
    )
    const err = await catchErr(client.login({ username: 'demo', password: 'bad' }))
    expect(err.kind).toBe('unauthorized')
    expect(tokenStore.get()).toBe(TOKEN)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })
})

describe('验收 3：令牌只存 tokenStore、不泄露', () => {
  it('登录成功写入令牌；公开接口不带 Authorization，受保护接口带 Bearer', async () => {
    const { client, fetch, tokenStore } = setup((call) => {
      if (call.url.endsWith('/auth/token')) {
        return ok(`{"accessToken":"${TOKEN}","tokenType":"Bearer","expiresIn":3600}`)
      }
      if (call.url.includes('/products')) return ok('[]')
      return ok('{"memberId":"10001"}')
    }, null)
    await expect(
      client.login({ username: 'demo', password: 'not-a-real-password' }),
    ).resolves.toEqual({
      accessToken: TOKEN,
      tokenType: 'Bearer',
      expiresIn: 3600,
    })
    expect(tokenStore.get()).toBe(TOKEN)
    await client.listProducts()
    await client.getCurrentMember()
    const h = (i: number) => fetch.calls[i]?.init?.headers as Record<string, string>
    expect(h(0).Authorization).toBeUndefined()
    expect(h(1).Authorization).toBeUndefined()
    expect(h(2).Authorization).toBe(`Bearer ${TOKEN}`)
    client.logout()
    expect(tokenStore.get()).toBeNull()
  })

  it('任何路径下 console 都不出现令牌，ApiError 不含令牌', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
      vi.spyOn(console, m).mockImplementation(() => {}),
    )
    const responses: Array<() => Response | Promise<Response>> = [
      // 后端恶意/意外回显令牌的消息
      () => json(400, `{"code":"INVALID_ARGUMENT","message":"bad token ${TOKEN}","data":null}`),
      () => json(403, `{"code":"HTTP_403","message":"${TOKEN}","data":null}`),
      () => json(401, '{"code":"HTTP_401","message":"x","data":null}'),
      () => new Response(`<html>${TOKEN}</html>`, { status: 500 }),
      () => Promise.reject(new TypeError(`fetch failed Authorization: Bearer ${TOKEN}`)),
    ]
    for (const r of responses) {
      const { client } = setup(r)
      const err = await catchErr(client.getCurrentMember())
      const dump = JSON.stringify({
        ...err,
        message: err.message,
        stack: err.stack,
        cause: (err as Error).cause,
      })
      expect(dump).not.toContain(TOKEN)
      expect(String(err)).not.toContain(TOKEN)
    }
    for (const spy of spies) {
      for (const args of spy.mock.calls) expect(JSON.stringify(args)).not.toContain(TOKEN)
    }
  })
})

describe('验收 4：错误分类', () => {
  it('403 → forbidden', async () => {
    const { client, tokenStore, onUnauthorized } = setup(() =>
      json(403, '{"code":"HTTP_403","message":"禁止访问","data":null}'),
    )
    expect(await catchErr(client.getCurrentMember())).toMatchObject({
      kind: 'forbidden',
      httpStatus: 403,
      code: 'HTTP_403',
    })
    expect(tokenStore.get()).toBe(TOKEN) // 403 不清令牌
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('429 + Retry-After 秒数', async () => {
    const { client } = setup(
      () => new Response('', { status: 429, headers: { 'Retry-After': '7' } }),
    )
    expect(await catchErr(client.listProducts())).toMatchObject({
      kind: 'rate-limited',
      httpStatus: 429,
      code: 'HTTP_429',
      retryAfterMs: 7000,
    })
  })

  it('429 + Retry-After HTTP 日期，且有上限', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-25T10:00:00Z'))
    const { client } = setup(
      () =>
        new Response('', {
          status: 429,
          headers: { 'Retry-After': 'Sun, 25 Oct 2026 10:00:10 GMT' },
        }),
    )
    expect((await catchErr(client.listProducts())).retryAfterMs).toBe(10_000)
    const { client: c2 } = setup(
      () => new Response('', { status: 429, headers: { 'Retry-After': '86400' } }),
    )
    expect((await catchErr(c2.listProducts())).retryAfterMs).toBe(5 * 60 * 1000)
  })

  it('429 无 Retry-After 时 retryAfterMs 为 undefined', async () => {
    const { client } = setup(() => new Response('', { status: 429 }))
    const err = await catchErr(client.listProducts())
    expect(err.kind).toBe('rate-limited')
    expect(err.retryAfterMs).toBeUndefined()
  })

  it('503（订单试算调用商品服务失败）', async () => {
    const { client } = setup(() =>
      json(503, '{"code":"HTTP_503","message":"商品服务不可用","data":null}', {
        'Retry-After': '2',
      }),
    )
    expect(await catchErr(client.quoteOrder({ productId: 1, quantity: 2 }))).toMatchObject({
      kind: 'service-unavailable',
      httpStatus: 503,
      message: '商品服务不可用',
      retryAfterMs: 2000,
    })
  })

  it('400 / 404', async () => {
    const { client } = setup(() =>
      json(404, '{"code":"HTTP_404","message":"商品不存在","data":null}'),
    )
    expect(await catchErr(client.getProduct(999))).toMatchObject({
      kind: 'not-found',
      httpStatus: 404,
    })
    const { client: c2 } = setup(() =>
      json(400, '{"code":"INVALID_ARGUMENT","message":"x","data":null}'),
    )
    expect((await catchErr(c2.quoteOrder({ productId: 1, quantity: 1 }))).kind).toBe(
      'invalid-argument',
    )
  })

  it('网络错误', async () => {
    const { client } = setup(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(await catchErr(client.listProducts())).toMatchObject({
      kind: 'network',
      httpStatus: null,
    })
  })

  it('超时 → timeout，并中止请求', async () => {
    let signal: AbortSignal | undefined
    const { client } = setup(
      (call) =>
        new Promise<Response>((_resolve, reject) => {
          signal = call.init?.signal ?? undefined
          signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
        }),
    )
    expect(await catchErr(client.listProducts())).toMatchObject({
      kind: 'timeout',
      httpStatus: null,
    })
    expect(signal?.aborted).toBe(true)
  })

  it('客户端参数校验：非法时抛 invalid-argument 且不发请求', async () => {
    const { client, fetch } = setup(() => ok('[]'))
    const bad: Array<() => Promise<unknown>> = [
      () => client.listProducts({ page: -1 }),
      () => client.listProducts({ page: 10001 }),
      () => client.listProducts({ page: 1.5 }),
      () => client.listProducts({ size: 0 }),
      () => client.listProducts({ size: 101 }),
      () => client.getProduct(0),
      () => client.getProduct(Number.NaN),
      () => client.quoteOrder({ productId: 0, quantity: 1 }),
      () => client.quoteOrder({ productId: 1, quantity: 0 }),
      () => client.quoteOrder({ productId: 1, quantity: 100 }),
      () => client.login({ username: '', password: 'x' }),
      () => client.login({ username: 'demo', password: '' }),
    ]
    for (const b of bad) {
      expect(await catchErr(b())).toMatchObject({ kind: 'invalid-argument', httpStatus: null })
    }
    expect(fetch.calls).toHaveLength(0)
    await client.listProducts({ page: 10000, size: 100 })
    expect(fetch.calls[0]?.url).toBe('/api/products?page=10000&size=100')
  })
})

describe('验收 5：金额保留原文字符串', () => {
  it('商品列表的 price 保留 "99.00"、"99.1"', async () => {
    const { client } = setup(() =>
      ok(
        '[{"id":1,"skuCode":"A","name":"a","price":99.00},{"id":2,"skuCode":"B","name":"b","price":99.1}]',
      ),
    )
    const list = await client.listProducts({ page: 0, size: 20 })
    expect(list.map((p) => p.price)).toEqual(['99.00', '99.1'])
    expect(typeof list[0]?.id).toBe('number')
  })

  it('订单试算 unitPrice/totalAmount 保留原文，请求体只含 productId/quantity', async () => {
    const { client, fetch } = setup(() =>
      ok('{"memberId":"10001","productId":1,"quantity":2,"unitPrice":99.00,"totalAmount":198.00}'),
    )
    await expect(client.quoteOrder({ productId: 1, quantity: 2 })).resolves.toEqual({
      memberId: '10001',
      productId: 1,
      quantity: 2,
      unitPrice: '99.00',
      totalAmount: '198.00',
    })
    const init = fetch.calls[0]?.init
    expect(init?.method).toBe('POST')
    expect(init?.body).toBe('{"productId":1,"quantity":2}')
  })

  it('后端改成字符串金额后同样兼容', async () => {
    const { client } = setup(() => ok('{"id":1,"skuCode":"A","name":"a","price":"1299.00"}'))
    expect((await client.getProduct(1)).price).toBe('1299.00')
  })

  it('moneyFields 可配置；baseUrl 去掉末尾斜杠', async () => {
    const fetch = fakeFetch(() => ok('{"id":1,"skuCode":"A","name":"a","price":5.50}'))
    const client = createApiClient({
      fetch,
      baseUrl: 'http://gw/api/',
      tokenStore: createMemoryTokenStore(),
      moneyFields: [],
    })
    // 不把 price 当金额时，数字 5.5 不满足 Product 约定 → invalid-response
    expect((await catchErr(client.getProduct(1))).kind).toBe('invalid-response')
    expect(fetch.calls[0]?.url).toBe('http://gw/api/products/1')
  })
})
