/**
 * GET /api/products 与 GET /api/products/{id} 的 MSW handler（FE-09，示例数据，非真实商品）。
 * 契约以 docs/api.md 为准：{code,message,data} 包装；列表 data 为数组、不带总数；
 * page 0–10000、size 1–100，非法返回 400；商品不存在返回 404。
 * 每个响应带 `X-Mock: true`。price 按后端真实形态以 JSON 数字字面量原文发出（如 1299.00）。
 */
import { http, type RequestHandler } from 'msw'
import type { Product } from '@selfmall/api'
import { PC_PARTS } from '../fixtures/pcParts'

const MONEY_STRING_FIELD = /"price":"(\d+\.\d{2})"/g

/** 序列化为 JSON 文本，并把 price 字符串还原为数字字面量（保留两位小数原文）。 */
export function serializeWithNumericPrice(body: unknown): string {
  return JSON.stringify(body).replace(MONEY_STRING_FIELD, '"price":$1')
}

function respond(status: number, body: unknown): Response {
  return new Response(serializeWithNumericPrice(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Mock': 'true' },
  })
}

const ok = (data: unknown) => respond(200, { code: 'OK', message: 'success', data })
const invalid = () =>
  respond(400, { code: 'INVALID_ARGUMENT', message: '请求参数不合法', data: null })

function parseIntParam(v: string | null, fallback: number): number | null {
  if (v === null) return fallback
  if (!/^\d+$/.test(v)) return null
  return Number(v)
}

export function createProductHandlers(
  products: readonly Product[] = PC_PARTS,
  base = '*/api',
): RequestHandler[] {
  return [
    http.get(`${base}/products`, ({ request }) => {
      const url = new URL(request.url)
      const page = parseIntParam(url.searchParams.get('page'), 0)
      const size = parseIntParam(url.searchParams.get('size'), 20)
      if (page === null || size === null || page > 10000 || size < 1 || size > 100) {
        return invalid()
      }
      return ok(products.slice(page * size, page * size + size))
    }),
    http.get(`${base}/products/:id`, ({ params }) => {
      const raw = String(params.id)
      if (!/^\d+$/.test(raw)) return invalid()
      const found = products.find((p) => p.id === Number(raw))
      if (!found) return respond(404, { code: 'HTTP_404', message: '商品不存在', data: null })
      return ok(found)
    }),
  ]
}
