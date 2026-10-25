// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getResponse, http, HttpResponse, type RequestHandler } from 'msw'
import { createApiClient, isApiError } from '@selfmall/api'
import { PC_PARTS } from '../fixtures/pcParts'
import { handlers } from './index'

const BASE = 'http://mock.test/api'
/**
 * msw 3 的 msw/node（setupServer）依赖 Node 22 的 Set.prototype.intersection 等 API，
 * 本仓库 Node 20.19 上不可用，因此用 msw 核心的 getResponse 直接驱动同一组 handler，
 * 作为 fetch 注入 FE-03 客户端（走完整的响应解析与金额预扫描）。未匹配请求直接报错。
 */
function mockFetch(list: RequestHandler[] = handlers) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const res = await getResponse(list, new Request(input, init))
    if (!res) throw new Error(`未匹配的请求：${String(input)}`)
    return res
  }
}
const fetch = mockFetch()
const client = (list?: RequestHandler[]) =>
  createApiClient({ baseUrl: BASE, fetch: mockFetch(list) })

describe('商品 mock handler', () => {
  it('列表：包装、X-Mock 头、price 按数字字面量原文发出', async () => {
    const res = await fetch(`${BASE}/products?page=0&size=2`)
    expect(res.headers.get('X-Mock')).toBe('true')
    const text = await res.text()
    expect(text).toContain(`"price":${PC_PARTS[0]!.price}`)
    const body = JSON.parse(text)
    expect(body.code).toBe('OK')
    expect(Array.isArray(body.data)).toBe(true)
    expect(body).not.toHaveProperty('data.total')
  })

  it('分页：最后一页少于 size，越界页返回空数组', async () => {
    const n = PC_PARTS.length
    const size = 10
    const lastPage = Math.floor((n - 1) / size)
    expect(await client().listProducts({ page: 0, size })).toHaveLength(size)
    const last = await client().listProducts({ page: lastPage, size })
    expect(last.length).toBe(n - lastPage * size)
    expect(last.length).toBeLessThan(size)
    expect(await client().listProducts({ page: lastPage + 1, size })).toEqual([])
    expect(await client().listProducts({ page: 9999, size })).toEqual([])
  })

  it('非法分页返回 400 INVALID_ARGUMENT', async () => {
    const res = await fetch(`${BASE}/products?page=0&size=101`)
    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe('INVALID_ARGUMENT')
  })

  it('与 FE-03 客户端联调：price 保持字符串并展示两位小数', async () => {
    const items = await client().listProducts({ page: 0, size: 30 })
    expect(items).toHaveLength(PC_PARTS.length)
    for (const [i, p] of items.entries()) {
      expect(typeof p.price).toBe('string')
      expect(p.price).toBe(PC_PARTS[i]!.price)
    }
    const one = await client().getProduct(2)
    expect(one.price).toBe('1299.00')
    const { displayPrice } = await import('@/api/price')
    expect(displayPrice(one.price)).toBe('¥1299.00')
  })

  it('详情命中', async () => {
    const res = await fetch(`${BASE}/products/1`)
    expect(res.headers.get('X-Mock')).toBe('true')
    expect(await client().getProduct(1)).toEqual(PC_PARTS[0])
  })

  it('详情不存在：404 + HTTP_404 包装，客户端归类为 not-found', async () => {
    const res = await fetch(`${BASE}/products/99999`)
    expect(res.status).toBe(404)
    expect(res.headers.get('X-Mock')).toBe('true')
    expect(await res.json()).toEqual({ code: 'HTTP_404', message: '商品不存在', data: null })
    const err = await client()
      .getProduct(99999)
      .catch((e: unknown) => e)
    expect(isApiError(err) && err.kind).toBe('not-found')
  })

  it('错误场景不被 mock 掩盖：覆盖为 503 时客户端照常报错', async () => {
    const failing = [
      http.get(`${BASE}/products`, () => HttpResponse.text('down', { status: 503 })),
      ...handlers,
    ]
    const err = await client(failing)
      .listProducts({ page: 0, size: 20 })
      .catch((e: unknown) => e)
    expect(isApiError(err) && err.kind).toBe('service-unavailable')
  })

  it('只 mock 商品接口：登录、试算、会员不在 handler 内', () => {
    const paths = handlers.map((h) => String((h.info as { path?: unknown }).path))
    expect(paths).toEqual(['*/api/products', '*/api/products/:id'])
  })
})
