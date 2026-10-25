import { afterEach, describe, expect, it, vi } from 'vitest'
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
    // 详情页为懒加载路由（FE-06 起含试算组件），固定轮数 settle 不足以等到导航完成
    await vi.waitFor(() => expect(document.title).toBe('商品详情 - SelfMall'))
    await settle()
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
    // FE-06 口径：纯字符串补零到两位，超过两位原样保留，不四舍五入、不截断
    expect(displayPrice('199')).toBe('¥199.00')
    expect(displayPrice('99.5')).toBe('¥99.50')
    expect(displayPrice('99.55')).toBe('¥99.55')
    expect(displayPrice('1.000')).toBe('¥1.000')
    expect(displayPrice('9.999')).toBe('¥9.999')
    expect(displayPrice('123456789012345678901')).toBe('¥123456789012345678901.00')
    expect(displayPrice('123456789012345678901.5')).toBe('¥123456789012345678901.50')
    // 既有处理：前导零规范、负数、非法串原样
    expect(displayPrice('007.5')).toBe('¥7.50')
    expect(displayPrice('-3.5')).toBe('¥-3.50')
    expect(displayPrice('1e3')).toBe('¥1e3')
    expect(displayPrice('abc')).toBe('¥abc')
  })
})
