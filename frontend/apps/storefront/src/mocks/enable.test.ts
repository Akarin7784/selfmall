import { describe, expect, it, vi } from 'vitest'
import { enableMocking, isMockEnabled } from './enable'

describe('mock 开关', () => {
  it('默认关，只有字符串 true 才开', () => {
    expect(isMockEnabled({})).toBe(false)
    expect(isMockEnabled({ VITE_ENABLE_MOCK: 'false' })).toBe(false)
    expect(isMockEnabled({ VITE_ENABLE_MOCK: '1' })).toBe(false)
    expect(isMockEnabled({ VITE_ENABLE_MOCK: 'true' })).toBe(true)
  })
  it('关闭时不加载、不注册 worker', async () => {
    const load = vi.fn()
    expect(await enableMocking(false, load)).toBe(false)
    expect(load).not.toHaveBeenCalled()
  })
  it('打开时启动 worker，未匹配请求 bypass', async () => {
    const start = vi.fn().mockResolvedValue(undefined)
    expect(await enableMocking(true, async () => ({ worker: { start } }))).toBe(true)
    expect(start).toHaveBeenCalledWith({ onUnhandledFrame: 'bypass' })
  })
})
