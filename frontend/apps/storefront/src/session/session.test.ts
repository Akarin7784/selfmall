import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOKEN_STORAGE_KEY } from '@selfmall/api'
import {
  apiError,
  createFakeApi,
  makeProducts,
  mountAt,
  settle,
  type FakeApi,
} from '@/test/harness'
import { api as realApi } from '@/api/client'
import { notifyUnauthorized } from './unauthorized'
import { loginErrorText } from './loginErrorText'

const FAKE_TOKEN = 'fake-test-token-not-a-jwt'
const FAKE_PASSWORD = 'fake-test-password'

let consoleSpies: ReturnType<typeof vi.spyOn>[] = []
beforeEach(() => {
  consoleSpies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((m) =>
    vi.spyOn(console, m).mockImplementation(() => {}),
  )
})
afterEach(() => {
  // 令牌与密码不得出现在任何 console 输出里
  for (const spy of consoleSpies) {
    const text = JSON.stringify(spy.mock.calls.map((c: unknown[]) => c.map(String)))
    expect(text).not.toContain(FAKE_TOKEN)
    expect(text).not.toContain(FAKE_PASSWORD)
    spy.mockRestore()
  }
  document.body.innerHTML = ''
  localStorage.clear()
  vi.unstubAllGlobals()
})

function loginSucceeds(api: FakeApi) {
  api.login.mockImplementation(async () => {
    api.tokenStore.set(FAKE_TOKEN)
    return { accessToken: FAKE_TOKEN, tokenType: 'Bearer', expiresIn: 3600 }
  })
}

async function fillAndSubmit(
  wrapper: Awaited<ReturnType<typeof mountAt>>['wrapper'],
  u = 'demo',
  p = FAKE_PASSWORD,
) {
  await wrapper.get('[data-test="username"]').setValue(u)
  await wrapper.get('[data-test="password"]').setValue(p)
  await wrapper.get('[data-test="login-form"]').trigger('submit')
  // 回跳目标是懒加载页面，多等几轮
  await settle(15)
}

describe('登录页', () => {
  it('演示登录说明、label、不预填', async () => {
    const { wrapper } = await mountAt('/login', createFakeApi())
    await settle()
    expect(wrapper.get('h1').text()).toBe('演示登录')
    expect(wrapper.get('[data-test="demo-note"]').text()).toContain('不是真实账号体系')
    expect(wrapper.find('label[for="login-username"]').exists()).toBe(true)
    expect(wrapper.find('label[for="login-password"]').exists()).toBe(true)
    expect((wrapper.get('[data-test="username"]').element as HTMLInputElement).value).toBe('')
    expect((wrapper.get('[data-test="password"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.get('[data-test="password"]').attributes('type')).toBe('password')
    expect(wrapper.get('[data-test="login-live"]').attributes('aria-live')).toBe('assertive')
    expect(document.title).toBe('演示登录 - SelfMall')
  })

  it('前端空值校验：不发请求，焦点到第一个出错字段', async () => {
    const api = createFakeApi()
    const { wrapper } = await mountAt('/login', api)
    await settle()
    await wrapper.get('[data-test="login-form"]').trigger('submit')
    await settle()
    expect(api.login).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('请输入用户名')
    expect(wrapper.text()).toContain('请输入密码')
    expect(document.activeElement?.id).toBe('login-username')
    await wrapper.get('[data-test="username"]').setValue('   ')
    await wrapper.get('[data-test="password"]').setValue('x')
    await wrapper.get('[data-test="login-form"]').trigger('submit')
    await settle()
    expect(api.login).not.toHaveBeenCalled()
  })

  it('登录成功：调用接口、回到 redirect 原页，导航变为「我的」', async () => {
    const api = createFakeApi()
    loginSucceeds(api)
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const { wrapper, router } = await mountAt('/login?redirect=%2Fme', api)
    await settle()
    expect(wrapper.get('[data-test="top-nav-account"]').text()).toBe('登录')
    await fillAndSubmit(wrapper)
    expect(api.login).toHaveBeenCalledWith({ username: 'demo', password: FAKE_PASSWORD })
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/me'), { timeout: 3000 })
    expect(wrapper.get('[data-test="top-nav-account"]').text()).toBe('我的')
    expect(wrapper.get('[data-test="bottom-nav-account"]').text()).toBe('我的')
  })

  it('非法 redirect 登录后回默认页 /products', async () => {
    const api = createFakeApi()
    loginSucceeds(api)
    api.listProducts.mockResolvedValue([])
    const { wrapper, router } = await mountAt('/login?redirect=%2F%2Fevil.example', api)
    await settle()
    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/products'), {
      timeout: 3000,
    })
  })

  it('提交中按钮禁用，防重复提交', async () => {
    const api = createFakeApi()
    api.login.mockReturnValue(new Promise(() => {}))
    const { wrapper } = await mountAt('/login', api)
    await settle()
    await fillAndSubmit(wrapper)
    const btn = wrapper.get('[data-test="submit"]')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(btn.text()).toContain('登录中')
    await wrapper.get('[data-test="login-form"]').trigger('submit')
    expect(api.login).toHaveBeenCalledTimes(1)
  })

  it('401 用户名或密码错误：不清已有令牌、不跳转，错误获得焦点，密码清空', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.login.mockRejectedValue(apiError('unauthorized', { httpStatus: 401 }))
    // 已登录访问 /login 会被跳走，这里先以未登录进入再放回令牌模拟“已有令牌”
    api.tokenStore.clear()
    const { wrapper, router } = await mountAt('/login?redirect=%2Fme', api)
    await settle()
    api.tokenStore.set(FAKE_TOKEN)
    await fillAndSubmit(wrapper)
    const err = wrapper.get('[data-test="login-error"]')
    expect(err.text()).toBe('用户名或密码错误')
    expect(err.attributes('role')).toBe('alert')
    expect(document.activeElement).toBe(err.element)
    expect(api.tokenStore.get()).toBe(FAKE_TOKEN)
    expect(api.logout).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/login')
    expect((wrapper.get('[data-test="password"]').element as HTMLInputElement).value).toBe('')
    expect(wrapper.text()).not.toContain(FAKE_PASSWORD)
  })

  it.each([
    ['invalid-argument', {}, '请填写用户名和密码'],
    ['rate-limited', { retryAfterMs: 12_500 }, '尝试过于频繁，请 13 秒后重试'],
    ['rate-limited', {}, '尝试过于频繁，请稍后重试'],
    ['network', {}, '网络异常，请检查网络后重试'],
    ['timeout', {}, '网络异常，请检查网络后重试'],
    ['server-error', { httpStatus: 500 }, '登录服务暂时不可用，请稍后重试'],
    ['service-unavailable', { httpStatus: 503 }, '登录服务暂时不可用，请稍后重试'],
    ['invalid-response', {}, '登录失败，请稍后重试'],
  ] as const)('%s 错误文案', async (kind, extra, text) => {
    const api = createFakeApi()
    api.login.mockRejectedValue(apiError(kind, extra))
    const { wrapper, router } = await mountAt('/login', api)
    await settle()
    await fillAndSubmit(wrapper)
    expect(wrapper.get('[data-test="login-error"]').text()).toBe(text)
    expect(router.currentRoute.value.path).toBe('/login')
    // 可以重试：按钮恢复可用
    expect(wrapper.get('[data-test="submit"]').attributes('disabled')).toBeUndefined()
  })

  it('非 ApiError 异常有兜底文案，不回显异常内容', () => {
    expect(loginErrorText(new Error(FAKE_PASSWORD))).toBe('登录失败，请重试')
  })
})

describe('路由守卫', () => {
  it('未登录访问 /me → /login?redirect=/me', async () => {
    const { router, wrapper } = await mountAt('/me', createFakeApi())
    await settle()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/me')
    expect(wrapper.find('[data-test="page-login"]').exists()).toBe(true)
  })

  it('已登录访问 /login 跳走（有合法 redirect 去 redirect，否则 /products）', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.listProducts.mockResolvedValue([])
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const a = await mountAt('/login?redirect=%2Fme', api)
    await settle()
    expect(a.router.currentRoute.value.path).toBe('/me')
    document.body.innerHTML = ''
    const b = await mountAt('/login?redirect=javascript:alert(1)', api)
    await settle()
    expect(b.router.currentRoute.value.path).toBe('/products')
  })

  it('商品页保持公开：未登录可访问列表与详情', async () => {
    const api = createFakeApi()
    api.listProducts.mockResolvedValue(makeProducts(2))
    api.getProduct.mockResolvedValue({ id: 1, skuCode: 'S', name: '商品 1', price: '1.00' })
    const a = await mountAt('/products', api)
    await settle()
    expect(a.router.currentRoute.value.path).toBe('/products')
    expect(a.wrapper.findAll('[data-test="product-card"]')).toHaveLength(2)
    document.body.innerHTML = ''
    const b = await mountAt('/products/1', api)
    await settle()
    expect(b.router.currentRoute.value.path).toBe('/products/1')
  })
})

describe('「我的」与退出', () => {
  it('/me 显示 memberId；服务错误显示错误态并可重试', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.getCurrentMember.mockRejectedValueOnce(apiError('server-error', { httpStatus: 500 }))
    api.getCurrentMember.mockResolvedValueOnce({ memberId: 'm-1' })
    const { wrapper } = await mountAt('/me', api)
    await settle()
    expect(wrapper.get('[data-test="error-state"]').text()).toContain('服务器出错了')
    await wrapper.get('[data-test="retry"]').trigger('click')
    await settle()
    expect(wrapper.get('[data-test="member-id"]').text()).toBe('会员 ID：m-1')
  })

  it('/me 显示登录状态，退出清令牌回登录页，导航变回「登录」', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const { wrapper, router } = await mountAt('/me', api)
    await settle()
    expect(wrapper.get('[data-test="login-status"]').text()).toContain('已登录')
    expect(wrapper.get('[data-test="bottom-nav-account"]').attributes('aria-current')).toBe('page')
    expect(wrapper.text()).not.toContain(FAKE_TOKEN)
    await wrapper.get('[data-test="logout"]').trigger('click')
    await settle()
    expect(api.logout).toHaveBeenCalled()
    expect(api.tokenStore.get()).toBeNull()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(wrapper.get('[data-test="top-nav-account"]').text()).toBe('登录')
    // 退出后再访问 /me 被守卫拦下
    await router.push('/me')
    await settle()
    expect(router.currentRoute.value.path).toBe('/login')
  })
})

describe('onUnauthorized 接线', () => {
  it('401 过期：同步会话、跳 /login?redirect=当前路径 并提示过期；登录后回原页', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const { wrapper, router } = await mountAt('/me', api)
    await settle()
    api.tokenStore.clear() // 客户端在调用 onUnauthorized 前已清令牌
    notifyUnauthorized()
    await settle()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/me')
    const notice = wrapper.get('[data-test="expired-notice"]')
    expect(notice.text()).toBe('登录已过期，请重新登录')
    expect(notice.attributes('role')).toBe('status')
    expect(wrapper.get('[data-test="top-nav-account"]').text()).toBe('登录')
    loginSucceeds(api)
    await fillAndSubmit(wrapper)
    await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/me'), { timeout: 3000 })
  })

  it('并发多个 401 只跳转一次；已在登录页不重复跳', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const { router } = await mountAt('/me', api)
    await settle()
    api.tokenStore.clear()
    const replace = vi.spyOn(router, 'replace')
    notifyUnauthorized()
    notifyUnauthorized()
    notifyUnauthorized()
    await settle()
    expect(replace).toHaveBeenCalledTimes(1)
    notifyUnauthorized()
    await settle()
    expect(replace).toHaveBeenCalledTimes(1)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('真实客户端单例：受保护接口本地无令牌 → 不发请求，通知应用跳转登录', async () => {
    const api = createFakeApi()
    api.tokenStore.set(FAKE_TOKEN)
    api.getCurrentMember.mockResolvedValue({ memberId: 'm-1' })
    const { router } = await mountAt('/me', api)
    await settle()
    localStorage.removeItem(TOKEN_STORAGE_KEY)
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    api.tokenStore.clear()
    await expect(realApi.getCurrentMember()).rejects.toMatchObject({ kind: 'unauthenticated' })
    await settle()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/login')
    expect(router.currentRoute.value.query.redirect).toBe('/me')
  })
})
