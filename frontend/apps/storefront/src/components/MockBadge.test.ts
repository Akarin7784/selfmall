import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import MockBadge from './MockBadge.vue'
import { createFakeApi, makeProducts, mountAt, settle } from '@/test/harness'

afterEach(() => {
  vi.unstubAllEnvs()
  document.body.innerHTML = ''
})

describe('MOCK 徽标', () => {
  it('开启时显示且有无障碍文本', () => {
    const w = mount(MockBadge, { props: { enabled: true } })
    expect(w.find('[data-test="mock-badge"]').exists()).toBe(true)
    expect(w.text()).toContain('示例数据')
  })
  it('关闭时不显示', () => {
    expect(mount(MockBadge, { props: { enabled: false } }).html()).not.toContain('MOCK')
  })
  it('默认（未设变量）列表页无徽标', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(3))
    const { wrapper } = await mountAt('/products?page=1', api)
    await settle()
    expect(wrapper.find('[data-test="mock-badge"]').exists()).toBe(false)
  })
  it('VITE_ENABLE_MOCK=true 时列表页和详情页都有徽标', async () => {
    vi.stubEnv('VITE_ENABLE_MOCK', 'true')
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(3))
    api.getProduct.mockResolvedValue(makeProducts(1)[0])
    const list = await mountAt('/products?page=1', api)
    await settle()
    expect(list.wrapper.find('[data-test="mock-badge"]').exists()).toBe(true)
    list.wrapper.unmount()
    const detail = await mountAt('/products/1', api)
    await settle()
    expect(detail.wrapper.find('[data-test="mock-badge"]').exists()).toBe(true)
  })
})
