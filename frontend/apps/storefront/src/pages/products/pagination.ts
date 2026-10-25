/** 接口页码范围 0–10000；URL 里 `?page=` 用从 1 开始的页码（1–10001），更直观。 */
export const PAGE_SIZE = 20
export const MAX_API_PAGE = 10000
export const MAX_URL_PAGE = MAX_API_PAGE + 1

/**
 * 解析 URL 页码。返回 { page, normalized }：page 为合法的 1-based 页码；
 * 原值缺省时 normalized=false 且 page=1；原值非法（非整数、<1、>上限）时 normalized=true，需要改写 URL。
 */
export function parsePageQuery(raw: unknown): { page: number; normalized: boolean } {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (value === undefined || value === null || value === '') return { page: 1, normalized: false }
  const text = String(value)
  if (!/^\d+$/.test(text)) return { page: 1, normalized: true }
  const n = Number(text)
  if (n < 1) return { page: 1, normalized: true }
  if (n > MAX_URL_PAGE) return { page: MAX_URL_PAGE, normalized: true }
  return { page: n, normalized: text !== String(n) }
}

/** 返回条数等于 size 才可能还有下一页；小于 size 视为最后一页。 */
export function hasNextPage(count: number, page: number, size = PAGE_SIZE): boolean {
  return count >= size && page < MAX_URL_PAGE
}
