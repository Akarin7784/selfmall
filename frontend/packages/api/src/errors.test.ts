import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_RETRY_AFTER_MS, kindFromStatus, parseRetryAfter } from './errors'

describe('Retry-After 解析（验收 4）', () => {
  const now = Date.parse('2026-10-25T10:00:00Z')

  it('秒数', () => {
    expect(parseRetryAfter('0', now)).toBe(0)
    expect(parseRetryAfter('3', now)).toBe(3000)
    expect(parseRetryAfter(' 120 ', now)).toBe(120_000)
  })

  it('HTTP 日期', () => {
    expect(parseRetryAfter('Sun, 25 Oct 2026 10:00:30 GMT', now)).toBe(30_000)
    expect(parseRetryAfter('Sun, 25 Oct 2026 09:00:00 GMT', now)).toBe(0) // 过去的时间
  })

  it('上限保护', () => {
    expect(parseRetryAfter('999999999', now)).toBe(DEFAULT_MAX_RETRY_AFTER_MS)
    expect(parseRetryAfter('9'.repeat(400), now)).toBe(DEFAULT_MAX_RETRY_AFTER_MS)
    expect(parseRetryAfter('Fri, 01 Jan 2100 00:00:00 GMT', now)).toBe(DEFAULT_MAX_RETRY_AFTER_MS)
    expect(parseRetryAfter('100', now, 10_000)).toBe(10_000)
  })

  it('无法解析时为 undefined', () => {
    for (const bad of [null, undefined, '', '-1', '1.5', 'soon', 'abc 123']) {
      expect(parseRetryAfter(bad, now)).toBeUndefined()
    }
  })

  it('状态码分类', () => {
    expect(kindFromStatus(400)).toBe('invalid-argument')
    expect(kindFromStatus(401)).toBe('unauthorized')
    expect(kindFromStatus(403)).toBe('forbidden')
    expect(kindFromStatus(404)).toBe('not-found')
    expect(kindFromStatus(429)).toBe('rate-limited')
    expect(kindFromStatus(503)).toBe('service-unavailable')
    expect(kindFromStatus(500)).toBe('server-error')
    expect(kindFromStatus(502)).toBe('server-error')
    expect(kindFromStatus(409)).toBe('http-error')
  })
})
