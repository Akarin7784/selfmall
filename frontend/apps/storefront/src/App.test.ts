import { afterEach, describe, expect, it } from 'vitest'
import { createFakeApi, makeProducts, mountAt, settle } from '@/test/harness'
import { BREAKPOINTS } from '@/styles/breakpoints'
import { shouldRetry } from '@/api/query'
import { displayPrice } from '@/api/price'
import { apiError } from '@/test/harness'

afterEach(() => {
  document.body.innerHTML = ''
})

describe('路由与布局', () => {
  it('/ 重定向到 /products，标题更新', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue([])
    const { router } = await mountAt('/', api)
    await settle()
    expect(router.currentRoute.value.path).toBe('/products')
    expect(document.title).toBe('商品列表 - SelfMall')
  })

  it('未知路径显示 404 页', async () => {
    const { wrapper } = await mountAt('/no/such/page', createFakeApi())
    await settle()
    expect(wrapper.find('[data-test="page-404"]').exists()).toBe(true)
    expect(document.title).toBe('页面不存在 - SelfMall')
  })

  it('语义地标与导航 aria-current', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(1))
    const { wrapper } = await mountAt('/products', api)
    await settle()
    expect(wrapper.find('header').exists()).toBe(true)
    expect(wrapper.find('main#main').exists()).toBe(true)
    expect(wrapper.findAll('nav[aria-label]').length).toBeGreaterThanOrEqual(2)
    expect(wrapper.get('[data-test="top-nav-products"]').attributes('aria-current')).toBe('page')
    expect(wrapper.get('[data-test="bottom-nav-products"]').attributes('aria-current')).toBe('page')
  })

  it('路由切换后焦点移到 h1，详情标题更新', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(1))
    api.getProduct.mockResolvedValue({ id: 1, skuCode: 'S', name: '商品 1', price: '1.00' })
    const { wrapper } = await mountAt('/products', api)
    await settle()
    await wrapper.get('[data-test="product-card"]').trigger('click')
    await settle()
    expect(document.title).toBe('商品详情 - SelfMall')
    expect(document.activeElement?.tagName).toBe('H1')
  })
})

describe('辅助逻辑', () => {
  it('断点常量', () => {
    expect(BREAKPOINTS).toEqual({ tablet: 768, desktop: 1200 })
  })
  it('重试策略', () => {
    expect(shouldRetry(0, apiError('network'))).toBe(true)
    expect(shouldRetry(0, apiError('timeout'))).toBe(true)
    expect(shouldRetry(0, apiError('server-error'))).toBe(true)
    expect(shouldRetry(1, apiError('server-error'))).toBe(false)
    expect(shouldRetry(0, apiError('not-found'))).toBe(false)
    expect(shouldRetry(0, apiError('rate-limited'))).toBe(false)
    expect(shouldRetry(0, new Error('x'))).toBe(false)
  })
  it('价格展示保持字符串，非法多位小数不舍入', () => {
    expect(displayPrice('99.00')).toBe('¥99.00')
    expect(displayPrice('1299.5')).toBe('¥1299.50')
    expect(displayPrice('0.105')).toBe('¥0.105')
  })
})
