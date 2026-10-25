import { afterEach, describe, expect, it } from 'vitest'
import { apiError, createFakeApi, mountAt, settle, type FakeApi } from '@/test/harness'
import { notifyUnauthorized } from '@/session/unauthorized'

const FAKE_TOKEN = 'fake-test-token-not-a-jwt'
const PRODUCT = { id: 3, skuCode: 'S3', name: '显示器', price: '1299.00' }

afterEach(() => {
  document.body.innerHTML = ''
})

function setup(loggedIn = true): FakeApi {
  const api = createFakeApi()
  api.getProduct.mockResolvedValue(PRODUCT)
  if (loggedIn) api.tokenStore.set(FAKE_TOKEN)
  return api
}

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function open(api: FakeApi, path = '/products/3') {
  const r = await mountAt(path, api)
  await settle()
  return r
}

describe('订单试算（FE-06）', () => {
  it('显示说明：仅试算、不创建订单、不预占库存、未计优惠运费税费', async () => {
    const { wrapper } = await open(setup())
    const note = wrapper.get('[data-test="quote-note"]').text()
    for (const w of ['仅试算价格', '不创建订单', '不预占库存', '未计优惠、运费、税费']) {
      expect(note).toContain(w)
    }
  })

  it('成功：按服务端原文纯字符串补零到两位，合计以 totalAmount 为准', async () => {
    const api = setup()
    // 故意让 totalAmount 与「单价×数量」不一致，证明前端不自己乘
    api.quoteOrder.mockResolvedValue({
      memberId: '10001',
      productId: 3,
      quantity: 2,
      unitPrice: '99.5',
      totalAmount: '199',
    })
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="qty-inc"]').trigger('click')
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(api.quoteOrder).toHaveBeenCalledWith({ productId: 3, quantity: 2 })
    expect(wrapper.get('[data-test="quote-unit"]').text()).toBe('¥99.50')
    expect(wrapper.get('[data-test="quote-qty"]').text()).toBe('2')
    expect(wrapper.get('[data-test="quote-total"]').text()).toBe('¥199.00')
    expect(wrapper.get('[data-test="quote-status"]').text()).toBe('试算完成')
    expect(wrapper.get('[data-test="quote-result-region"]').attributes('aria-live')).toBe('polite')
  })

  it('超过两位小数原样保留、超大数不丢精度', async () => {
    const api = setup()
    api.quoteOrder.mockResolvedValue({
      memberId: '1',
      productId: 3,
      quantity: 1,
      unitPrice: '0.105',
      totalAmount: '123456789012345678901.5',
    })
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(wrapper.get('[data-test="quote-unit"]').text()).toBe('¥0.105')
    expect(wrapper.get('[data-test="quote-total"]').text()).toBe('¥123456789012345678901.50')
  })

  it('试算中禁用按钮并播报，重复点击只发一次', async () => {
    const api = setup()
    const d = deferred<unknown>()
    api.quoteOrder.mockReturnValue(d.promise)
    const { wrapper } = await open(api)
    const btn = wrapper.get('[data-test="quote-submit"]')
    await btn.trigger('click')
    await btn.trigger('click')
    await settle()
    expect(api.quoteOrder).toHaveBeenCalledTimes(1)
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.get('[data-test="quote-status"]').text()).toBe('正在试算…')
    d.resolve({ memberId: '1', productId: 3, quantity: 1, unitPrice: '1', totalAmount: '1' })
    await settle()
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('数量改动清掉旧结果，并忽略在途旧响应，只展示最新一次', async () => {
    const api = setup()
    api.quoteOrder.mockResolvedValueOnce({
      memberId: '1',
      productId: 3,
      quantity: 1,
      unitPrice: '10',
      totalAmount: '10',
    })
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(wrapper.find('[data-test="quote-result"]').exists()).toBe(true)
    await wrapper.get('[data-test="qty-inc"]').trigger('click')
    expect(wrapper.find('[data-test="quote-result"]').exists()).toBe(false)

    const slow = deferred<unknown>()
    api.quoteOrder.mockReturnValueOnce(slow.promise)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    await wrapper.get('[data-test="qty"]').setValue('5') // 改数量：在途请求作废
    const fresh = deferred<unknown>()
    api.quoteOrder.mockReturnValueOnce(fresh.promise)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    fresh.resolve({ memberId: '1', productId: 3, quantity: 5, unitPrice: '10', totalAmount: '50' })
    await settle()
    slow.resolve({ memberId: '1', productId: 3, quantity: 2, unitPrice: '10', totalAmount: '20' })
    await settle()
    expect(wrapper.get('[data-test="quote-total"]').text()).toBe('¥50.00')
    expect(wrapper.get('[data-test="quote-qty"]').text()).toBe('5')
  })

  it.each([['0'], ['100'], ['1.5'], [''], ['ab']])('数量非法 %j：前端拦截，不发请求', async (v) => {
    const api = setup()
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="qty"]').setValue(v)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(wrapper.get('[data-test="qty-error"]').text()).toContain('1–99 的整数')
    expect(api.quoteOrder).not.toHaveBeenCalled()
  })

  it('数量边界：1 不能再减、99 不能再加；1 与 99 可试算', async () => {
    const api = setup()
    api.quoteOrder.mockResolvedValue({
      memberId: '1',
      productId: 3,
      quantity: 99,
      unitPrice: '1',
      totalAmount: '99',
    })
    const { wrapper } = await open(api)
    expect(wrapper.get('[data-test="qty-dec"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(api.quoteOrder).toHaveBeenLastCalledWith({ productId: 3, quantity: 1 })
    await wrapper.get('[data-test="qty"]').setValue('99')
    expect(wrapper.get('[data-test="qty-inc"]').attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="qty-inc"]').trigger('click')
    expect((wrapper.get('[data-test="qty"]').element as HTMLInputElement).value).toBe('99')
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(api.quoteOrder).toHaveBeenLastCalledWith({ productId: 3, quantity: 99 })
  })

  it.each([
    ['invalid-argument', 400, '试算参数不合法', false],
    ['not-found', 404, '商品不存在或已下架，无法试算', false],
    ['service-unavailable', 503, '服务暂时不可用', true],
    ['server-error', 500, '服务器出错了', true],
    ['network', undefined, '网络异常', true],
    ['timeout', undefined, '网络异常', true],
    ['http-error', 418, '试算失败', false],
  ] as const)('错误 %s：文案如实、不显示合计', async (kind, status, text, retry) => {
    const api = setup()
    api.quoteOrder.mockRejectedValue(apiError(kind, status ? { httpStatus: status } : {}))
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    const err = wrapper.get('[data-test="quote-error"]')
    expect(err.attributes('role')).toBe('alert')
    expect(err.text()).toContain(text)
    expect(err.text().includes('可点击「试算」重试')).toBe(retry)
    expect(document.activeElement).toBe(err.element)
    // 不用详情页价格兜底算合计
    expect(wrapper.find('[data-test="quote-result"]').exists()).toBe(false)
    expect(wrapper.get('[data-test="quote"]').text()).not.toContain('¥')
  })

  it('429：提示 Retry-After 秒数', async () => {
    const api = setup()
    api.quoteOrder.mockRejectedValue(
      apiError('rate-limited', { httpStatus: 429, retryAfterMs: 7000 }),
    )
    const { wrapper } = await open(api)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(wrapper.get('[data-test="quote-error"]').text()).toContain('请 7 秒后重试')
  })

  it('401：不在试算区另显示错误，由 onUnauthorized 跳登录并带原页', async () => {
    const api = setup()
    api.quoteOrder.mockImplementation(async () => {
      api.tokenStore.clear()
      notifyUnauthorized()
      throw apiError('unauthorized', { httpStatus: 401 })
    })
    const { wrapper, router } = await open(api)
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/products/3')
    expect(router.currentRoute.value.query.reason).toBe('expired')
  })

  it('未登录点试算：跳 /login?redirect=原页（含 qty），不发请求；登录后回原页只恢复数量不自动试算', async () => {
    const api = setup(false)
    api.login.mockImplementation(async () => {
      api.tokenStore.set(FAKE_TOKEN)
      return { accessToken: FAKE_TOKEN, tokenType: 'Bearer', expiresIn: 3600 }
    })
    const { wrapper, router } = await open(api)
    await wrapper.get('[data-test="qty"]').setValue('7')
    await wrapper.get('[data-test="quote-submit"]').trigger('click')
    await settle()
    expect(api.quoteOrder).not.toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('login')
    expect(router.currentRoute.value.query.redirect).toBe('/products/3?qty=7')

    await wrapper.get('[data-test="username"]').setValue('demo')
    await wrapper.get('[data-test="password"]').setValue('not-a-real-password')
    await wrapper.get('[data-test="login-form"]').trigger('submit')
    await settle()
    expect(router.currentRoute.value.fullPath).toBe('/products/3?qty=7')
    expect((wrapper.get('[data-test="qty"]').element as HTMLInputElement).value).toBe('7')
    expect(api.quoteOrder).not.toHaveBeenCalled()
  })

  it.each(['0', '100', '1.5', '%202', '02', '1e1', '9999999999'])(
    'qty=%s 非法回跳回退为 1',
    async (q) => {
      const { wrapper } = await open(setup(), `/products/3?qty=${q}`)
      expect((wrapper.get('[data-test="qty"]').element as HTMLInputElement).value).toBe('1')
    },
  )

  it('数组形式 qty 回退为 1；合法 qty 恢复', async () => {
    const a = await open(setup(), '/products/3?qty=5&qty=6')
    expect((a.wrapper.get('[data-test="qty"]').element as HTMLInputElement).value).toBe('1')
    a.wrapper.unmount()
    document.body.innerHTML = ''
    const b = await open(setup(), '/products/3?qty=42')
    expect((b.wrapper.get('[data-test="qty"]').element as HTMLInputElement).value).toBe('42')
  })

  it('商品 404 时不显示试算区', async () => {
    const api = createFakeApi()
    api.getProduct.mockRejectedValue(apiError('not-found', { httpStatus: 404 }))
    const { wrapper } = await mountAt('/products/9', api)
    await settle(10)
    expect(wrapper.find('[data-test="quote"]').exists()).toBe(false)
  })
})
