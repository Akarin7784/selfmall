// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { getResponse } from 'msw'
import { handlers } from './index'

/** FE-05：mock 开启时登录与受保护接口不被拦截，照常经 Vite 代理走真实后端。 */
describe('mock 不拦截登录与受保护接口', () => {
  it.each([
    ['POST', '/api/auth/token'],
    ['GET', '/api/members/me'],
    ['POST', '/api/orders/quote'],
  ])('%s %s 无匹配 handler', async (method, path) => {
    const req = new Request(`http://localhost:5173${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: method === 'POST' ? '{}' : undefined,
    })
    expect(await getResponse(handlers, req)).toBeUndefined()
  })

  it('商品接口仍由 mock 处理（对照）', async () => {
    const res = await getResponse(
      handlers,
      new Request('http://localhost:5173/api/products?page=0&size=1'),
    )
    expect(res?.headers.get('X-Mock')).toBe('true')
  })
})
