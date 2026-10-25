import { afterEach, describe, expect, it } from 'vitest'
import { apiError, createFakeApi, makeProducts, mountAt, settle } from '@/test/harness'
import { hasNextPage, parsePageQuery } from './pagination'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('商品列表页', () => {
  it('加载中显示骨架屏（aria-busy、role=status）', async () => {
    const api = createFakeApi()
    api.listProducts.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountAt('/products', api)
    const loading = wrapper.get('[data-test="loading"]')
    expect(loading.attributes('aria-busy')).toBe('true')
    expect(loading.attributes('role')).toBe('status')
    expect(api.listProducts).toHaveBeenCalledWith({ page: 0, size: 20 })
  })

  it('成功：展示名称、skuCode、¥价格（字符串原样）', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue([
      { id: 1, skuCode: 'KB-001', name: '机械键盘', price: '99.00' },
      { id: 2, skuCode: 'MS-002', name: '鼠标', price: '1299.5' },
      { id: 3, skuCode: 'BIG-1', name: '大额', price: '12345678901.99' },
    ])
    const { wrapper } = await mountAt('/products', api)
    await settle()
    const cards = wrapper.findAll('[data-test="product-card"]')
    expect(cards).toHaveLength(3)
    expect(cards[0]!.text()).toContain('机械键盘')
    expect(cards[0]!.text()).toContain('KB-001')
    const prices = wrapper.findAll('[data-test="price"]').map((p) => p.text())
    expect(prices).toEqual(['¥99.00', '¥1299.50', '¥12345678901.99'])
    expect(cards[0]!.attributes('href')).toBe('/products/1')
    // 占位块不进读屏
    expect(wrapper.find('.placeholder').attributes('aria-hidden')).toBe('true')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('第一页为空：暂无商品', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue([])
    const { wrapper } = await mountAt('/products', api)
    await settle()
    expect(wrapper.get('[data-test="empty-state"]').text()).toContain('暂无商品')
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()
  })

  it.each([
    ['network', {}, '网络异常，请重试'],
    ['timeout', {}, '网络异常，请重试'],
    ['rate-limited', { retryAfterMs: 3000 }, '请求过于频繁，请 3 秒后重试'],
    ['rate-limited', {}, '请求过于频繁，请稍后重试'],
    ['service-unavailable', {}, '服务暂时不可用'],
    ['server-error', {}, '服务器出错了'],
    ['invalid-response', {}, '加载失败，请重试'],
    ['http-error', {}, '加载失败，请重试'],
  ] as const)('错误 %s 显示对应文案和重试按钮', async (kind, extra, text) => {
    const api = createFakeApi()
    api.listProducts.mockRejectedValue(apiError(kind, extra))
    const { wrapper } = await mountAt('/products', api)
    await settle()
    const alert = wrapper.get('[data-test="error-state"]')
    expect(alert.attributes('role')).toBe('alert')
    expect(alert.text()).toContain(text)
    expect(wrapper.find('[data-test="retry"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="product-card"]').exists()).toBe(false)
  })

  it('网络/5xx 自动重试 1 次，4xx 不重试', async () => {
    const a = createFakeApi()
    a.listProducts.mockRejectedValue(apiError('network'))
    await mountAt('/products', a)
    await settle(10)
    expect(a.listProducts).toHaveBeenCalledTimes(2)

    document.body.innerHTML = ''
    const b = createFakeApi()
    b.listProducts.mockRejectedValue(apiError('invalid-argument', { httpStatus: 400 }))
    await mountAt('/products', b)
    await settle(10)
    expect(b.listProducts).toHaveBeenCalledTimes(1)
  })

  it('点击重试后重新请求并展示数据', async () => {
    const api = createFakeApi()
    api.listProducts.mockRejectedValue(apiError('rate-limited', { retryAfterMs: 1000 }))
    const { wrapper } = await mountAt('/products', api)
    await settle()
    api.listProducts.mockResolvedValue(makeProducts(2))
    await wrapper.get('[data-test="retry"]').trigger('click')
    await settle()
    expect(wrapper.findAll('[data-test="product-card"]')).toHaveLength(2)
    expect(wrapper.find('[data-test="error-state"]').exists()).toBe(false)
  })

  it('分页：满页可下一页，第一页上一页不可用；最后一页（不足 size）下一页不可用', async () => {
    const api = createFakeApi()
    api.listProducts.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve(page === 0 ? makeProducts(20) : makeProducts(5, 21)),
    )
    const { wrapper, router } = await mountAt('/products', api)
    await settle()
    expect(wrapper.get('[data-test="prev"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-test="next"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.page).toBe('2')
    expect(api.listProducts).toHaveBeenLastCalledWith({ page: 1, size: 20 })
    expect(wrapper.findAll('[data-test="product-card"]')).toHaveLength(5)
    expect(wrapper.get('[data-test="page-indicator"]').text()).toBe('第 2 页')
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="prev"]').attributes('disabled')).toBeUndefined()

    await wrapper.get('[data-test="prev"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.query.page).toBe('1')
  })

  it('满页后下一页为空：友好空态，不报错', async () => {
    const api = createFakeApi()
    api.listProducts.mockImplementation(({ page }: { page: number }) =>
      Promise.resolve(page === 0 ? makeProducts(20) : []),
    )
    const { wrapper } = await mountAt('/products', api)
    await settle()
    await wrapper.get('[data-test="next"]').trigger('click')
    await settle()
    expect(wrapper.find('[data-test="error-state"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="empty-state"]').text()).toContain('这一页没有商品了')
    expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()
  })

  it.each([
    ['abc', '1', 0],
    ['0', '1', 0],
    ['-3', '1', 0],
    ['1.5', '1', 0],
    ['99999', '10001', 10000],
    ['007', '7', 6],
  ])('page=%s 越界或非法时改写为 %s，请求 page=%i', async (raw, fixed, apiPage) => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(20))
    const { router, wrapper } = await mountAt(`/products?page=${raw}`, api)
    await settle()
    expect(router.currentRoute.value.query.page).toBe(fixed)
    expect(api.listProducts).toHaveBeenLastCalledWith({ page: apiPage, size: 20 })
    for (const call of api.listProducts.mock.calls) {
      const p = (call[0] as { page: number }).page
      expect(p >= 0 && p <= 10000).toBe(true)
    }
    if (fixed === '10001') {
      expect(wrapper.get('[data-test="next"]').attributes('disabled')).toBeDefined()
    }
  })
})

describe('分页工具', () => {
  it('parsePageQuery', () => {
    expect(parsePageQuery(undefined)).toEqual({ page: 1, normalized: false })
    expect(parsePageQuery('3')).toEqual({ page: 3, normalized: false })
    expect(parsePageQuery(['4'])).toEqual({ page: 4, normalized: false })
    expect(parsePageQuery('10002')).toEqual({ page: 10001, normalized: true })
  })
  it('hasNextPage', () => {
    expect(hasNextPage(20, 1)).toBe(true)
    expect(hasNextPage(19, 1)).toBe(false)
    expect(hasNextPage(20, 10001)).toBe(false)
  })
})
