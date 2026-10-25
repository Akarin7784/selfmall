import { afterEach, describe, expect, it } from 'vitest'
import { apiError, createFakeApi, mountAt, settle } from '@/test/harness'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('商品详情页', () => {
  it('加载态', async () => {
    const api = createFakeApi()
    api.getProduct.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountAt('/products/7', api)
    expect(wrapper.get('[data-test="loading"]').attributes('aria-busy')).toBe('true')
    expect(api.getProduct).toHaveBeenCalledWith(7)
  })

  it('成功：展示 id、skuCode、name、价格，不展示库存/图片/描述/购物车', async () => {
    const api = createFakeApi()
    api.getProduct.mockResolvedValue({
      id: 7,
      skuCode: 'KB-007',
      name: '机械键盘',
      price: '1299.5',
    })
    const { wrapper } = await mountAt('/products/7', api)
    await settle()
    expect(wrapper.get('h1').text()).toBe('机械键盘')
    expect(wrapper.get('[data-test="id"]').text()).toBe('7')
    expect(wrapper.get('[data-test="sku"]').text()).toBe('KB-007')
    expect(wrapper.get('[data-test="price"]').text()).toBe('¥1299.50')
    // 商品信息区不展示库存等字段（试算区说明里的「不预占库存」不算）
    const text = wrapper.get('[data-test="product-detail"]').text()
    for (const word of ['库存', '描述', '类目', '购物车', '下单']) expect(text).not.toContain(word)
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.placeholder').attributes('aria-hidden')).toBe('true')
  })

  it('价格 99.00 原样显示 ¥99.00', async () => {
    const api = createFakeApi()
    api.getProduct.mockResolvedValue({ id: 1, skuCode: 'A', name: 'A', price: '99.00' })
    const { wrapper } = await mountAt('/products/1', api)
    await settle()
    expect(wrapper.get('[data-test="price"]').text()).toBe('¥99.00')
  })

  it('404：商品不存在或已下架，可返回列表，不重试', async () => {
    const api = createFakeApi()
    api.getProduct.mockRejectedValue(apiError('not-found', { httpStatus: 404 }))
    const { wrapper } = await mountAt('/products/404', api)
    await settle(10)
    const nf = wrapper.get('[data-test="not-found"]')
    expect(nf.text()).toContain('商品不存在或已下架')
    expect(nf.get('a').attributes('href')).toBe('/products')
    expect(api.getProduct).toHaveBeenCalledTimes(1)
  })

  it('非法 id 不发请求，直接显示不存在', async () => {
    const api = createFakeApi()
    const { wrapper } = await mountAt('/products/abc', api)
    await settle()
    expect(wrapper.find('[data-test="not-found"]').exists()).toBe(true)
    expect(api.getProduct).not.toHaveBeenCalled()
  })

  it('503 错误态 + 重试成功', async () => {
    const api = createFakeApi()
    api.getProduct.mockRejectedValue(apiError('service-unavailable', { httpStatus: 503 }))
    const { wrapper } = await mountAt('/products/3', api)
    await settle(10)
    expect(wrapper.get('[role="alert"]').text()).toContain('服务暂时不可用')
    expect(api.getProduct).toHaveBeenCalledTimes(2) // 自动重试 1 次
    api.getProduct.mockResolvedValue({ id: 3, skuCode: 'S3', name: '显示器', price: '10' })
    await wrapper.get('[data-test="retry"]').trigger('click')
    await settle()
    expect(wrapper.get('[data-test="price"]').text()).toBe('¥10.00')
  })
})
